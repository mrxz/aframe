var registerComponent = require('../core/component').registerComponent;
var THREE = require('../lib/three');
var troika = require('troika-three-text');
var Text = troika.Text;

// 1 to match other A-Frame default widths.
var DEFAULT_WIDTH = 1;
var DEFAULT_FONT = 'roboto';

var AFRAME_CDN_ROOT = 'https://cdn.jsdelivr.net/gh/mrxz/aframe-assets@master/'; // require('../constants').AFRAME_CDN_ROOT;
var FONT_BASE_URL = AFRAME_CDN_ROOT + 'fonts/';
var FONTS = {
  aileronsemibold: { src: FONT_BASE_URL + 'Aileron-Semibold.otf', pixelUnits: 32 },
  dejavu: { src: FONT_BASE_URL + 'DejaVuSans.ttf', pixelUnits: 32 },
  exo2bold: { src: FONT_BASE_URL + 'Exo2Bold.woff', pixelUnits: 32 },
  exo2semibold: { src: FONT_BASE_URL + 'Exo2SemiBold.woff', pixelUnits: 32 },
  kelsonsans: { src: FONT_BASE_URL + 'Kelson.woff', pixelUnits: 32 },
  monoid: { src: FONT_BASE_URL + 'Monoid-Regular.ttf', pixelUnits: 32 },
  mozillavr: { src: FONT_BASE_URL + 'mozillavr.fnt', pixelUnits: 32 }, // FIXME: can't find source font
  roboto: { src: FONT_BASE_URL + 'Roboto.woff', pixelUnits: 38.96484375 },
  sourcecodepro: { src: FONT_BASE_URL + 'SourceCodePro.woff', pixelUnits: 32 }
};

// Cache of computed font metrics
var FONT_METRICS_CACHE = {};

var NEW_LINE_REGEX = /\\n/g;
var TAB_REGEX = /\\t/g;
var TRIM_NEWLINE_REGEX = /\s*\n\s*/g;

/**
 * SDF-based text component.
 * Uses Troika text rendering https://github.com/protectwise/troika/tree/main/packages/troika-three-text.
 */
module.exports.Component = registerComponent('text', {
  multiple: true,

  schema: {
    align: {type: 'string', default: 'left', oneOf: ['left', 'right', 'center']},
    // `anchor` defaults to center to match geometries.
    anchor: {default: 'center', oneOf: ['left', 'right', 'center', 'align']},
    baseline: {default: 'center', oneOf: ['top', 'center', 'bottom']},
    color: {type: 'color', default: '#FFF'},
    font: {type: 'string', default: DEFAULT_FONT},
    // `height` has no default, will be populated at layout.
    height: {type: 'number'},
    letterSpacing: {type: 'number', default: 0},
    // `lineHeight` defaults to font's `lineHeight` value.
    lineHeight: {type: 'number'},
    opacity: {type: 'number', default: 1.0},
    side: {default: 'front', oneOf: ['front', 'back', 'double']},
    tabSize: {default: 4},
    transparent: {default: true},
    value: {type: 'string'},
    whiteSpace: {default: 'normal', oneOf: ['normal', 'pre', 'nowrap']},
    // `width` defaults to geometry width if present, else `DEFAULT_WIDTH`.
    width: {type: 'number'},
    // `wrapCount` units are about one default font character. Wrap roughly at this number.
    wrapCount: {type: 'number', default: 40},
    // `wrapPixels` will wrap using pixel units (e.g., dejavu's is 32 pixels).
    wrapPixels: {type: 'number'},
    // `xOffset` to add padding.
    xOffset: {type: 'number', default: 0},
    // `yOffset` to adjust generated fonts from tools that may have incorrect metrics.
    yOffset: {type: 'number', default: 0},
    // `zOffset` will provide a small z offset to avoid z-fighting.
    zOffset: {type: 'number', default: 0.001},

    // Deprecated
    alphaTest: {default: 0.5},
    fontImage: {type: 'string'},
    negate: {type: 'boolean', default: true}
  },

  init: function () {
    this.textMesh = new Text();
    this.material = this.textMesh.material;
    this.el.setObject3D(this.attrName, this.textMesh);
    this.explicitGeoDimensionsChecked = false;

    this.computeFontMetrics = this.computeFontMetrics.bind(this);
    this.updateLayout = this.updateLayout.bind(this);

    this.fontMetricsPromise = null;
    this.textRenderWidth = 0;

    // Backwards compatibility
    var material = this.material;
    material.uniforms['opacity'] = Object.defineProperty({}, 'value', {
      get: function () {
        return material.opacity;
      },
      set: function (value) {
        material.opacity = value;
      }
    });
    material.uniforms['color'] = { value: material.color };
  },

  update: function () {
    var data = this.data;
    var mesh = this.textMesh;
    var material = this.material;

    // Loading or computing font metrics is in progress, text can't be updated
    if (this.fontMetricsPromise) {
      return;
    }

    // Check if the font metrics are available
    var font = this.data.font;
    var fontUrl = FONTS[font] ? FONTS[font].src : font;
    var fontMetrics = FONT_METRICS_CACHE[font];
    if (!fontMetrics || fontMetrics.then) {
      this.loadFontForMetrics(font, fontUrl);
      return;
    }

    // Use fontSize 1.0 to normalize everything, actual scale is handled in updateLayout
    mesh.fontSize = 1.0;
    mesh.textAlign = data.align;
    // Set anchor point in the middle, handle user defined anchor point in updateLayout
    mesh.anchorX = 'center';
    mesh.anchorY = 'middle';
    mesh.overflowWrap = 'break-word';
    // Set material color instead of mesh color for compatibility with animation component
    material.color.set(data.color);
    mesh.font = fontUrl;
    mesh.letterSpacing = data.letterSpacing * fontMetrics.pixelUnitSize;
    // `lineHeight` defaults to font's `lineHeight` value
    mesh.lineHeight = data.lineHeight * fontMetrics.pixelUnitSize;
    material.opacity = data.opacity;
    material.side = parseSide(data.side);
    material.transparent = data.transparent;
    mesh.text = data.value.toString();
    if (data.whiteSpace !== 'pre') {
      // Strip whitespace around newlines, original behaviour of three-bmfont-text
      mesh.text = mesh.text
        .replace(TRIM_NEWLINE_REGEX, '\n').trim();
    }
    mesh.text = mesh.text
      .replace(NEW_LINE_REGEX, '\n')
      .replace(TAB_REGEX, ' '.repeat(data.tabSize));
    mesh.whiteSpace = data.whiteSpace === 'nowrap' ? 'nowrap' : 'normal';
    this.textRenderWidth = data.wrapPixels
      ? data.wrapPixels * fontMetrics.pixelUnitSize
      : (0.5 + data.wrapCount) * fontMetrics.widthFactor;
    mesh.maxWidth = this.textRenderWidth;
    mesh.sync(this.updateLayout);
  },

  /**
   * Clean up geometry, material, texture, mesh, objects.
   */
  remove: function () {
    this.textMesh.dispose();
    this.textMesh = null;
    this.el.removeObject3D(this.attrName);
  },

  loadFontForMetrics: function (font, fontUrl) {
    var self = this;

    if (FONT_METRICS_CACHE[font]) {
      // Promise has already been created
      this.fontMetricsPromise = FONT_METRICS_CACHE[font].then(function () {
        self.fontMetricsPromise = undefined;
        self.update();
      });
      return;
    }

    FONT_METRICS_CACHE[font] = new Promise(function (resolve, reject) {
      // Resolve font for all digits to measure widthFactor and pixelUnitSize
      troika.fontResolverWorkerModule.onMainThread('0123456789',
        function onResolved (result) {
          self.computeFontMetrics(font, result.fonts[0]);
          resolve();
        },
        {
          lang: 'en',
          fonts: [{ src: fontUrl }],
          style: null,
          weight: null,
          unicodeFontsUrl: null
        }
      );
    });
  },

  computeFontMetrics: function (font, fontData) {
    var sum = 0;
    var digits = 0;
    fontData.forEachGlyph('0123456789', 0, 0, function (glyphObj, glyphX, glyphY, charIndex) {
      sum += glyphObj.advanceWidth;
      digits++;
    });

    var pixelUnits = FONTS[font] ? FONTS[font].pixelUnits : 1;
    FONT_METRICS_CACHE[font] = {
      widthFactor: (sum / digits) / fontData.unitsPerEm,
      pixelUnitSize: 1 / pixelUnits
    };

    this.update();
  },

  /**
   * Update layout with anchor, alignment, baseline, and considering any meshes.
   */
  updateLayout: function () {
    var align;
    var anchor;
    var baseline;
    var el = this.el;
    var data = this.data;
    var geometryComponent;
    var textRenderWidth = this.textRenderWidth;
    var textScale = 1.0;
    var width;
    var x = 0;
    var y = 0;
    var bounds;

    // Determine width to use (defined width, geometry's width, or default width).
    geometryComponent = el.getAttribute('geometry');
    width = data.width || (geometryComponent && geometryComponent.width) || DEFAULT_WIDTH;

    if (!this.textMesh.textRenderInfo) {
      return;
    }

    // Mesh positioning
    textScale = width / textRenderWidth;

    // Determine rendered text dimensions
    bounds = this.textMesh.textRenderInfo.blockBounds;
    var textWidth = (bounds[2] - bounds[0]) * textScale;
    var textHeight = (bounds[3] - bounds[1]) * textScale;

    align = data.align;
    if (align === 'left') {
      x = -(width - textWidth) / 2;
    } else if (align === 'right') {
      x = (width - textWidth) / 2;
    } else if (align === 'center') {
      x = 0;
    } else {
      throw new TypeError('Invalid text.align property value', anchor);
    }

    anchor = data.anchor === 'align' ? data.align : data.anchor;
    if (anchor === 'left') {
      x += width / 2;
    } else if (anchor === 'right') {
      x -= width / 2;
    } else if (anchor !== 'center') {
      throw new TypeError('Invalid text.anchor property value', anchor);
    }

    // Calculate Y position to anchor text top, center, or bottom.
    baseline = data.baseline;
    if (baseline === 'bottom') {
      y += textHeight / 2;
    } else if (baseline === 'top') {
      y -= textHeight / 2;
    } else if (baseline !== 'center') {
      throw new TypeError('Invalid text.baseline property value', baseline);
    }

    this.textMesh.position.set(x + data.xOffset, y + data.yOffset, data.zOffset);
    this.textMesh.scale.set(textScale, textScale, textScale);

    // Update geometry dimensions to match text layout if width and height are set to 0.
    // For example, scales a plane to fit text.
    if (geometryComponent && geometryComponent.primitive === 'plane') {
      if (!this.explicitGeoDimensionsChecked) {
        this.explicitGeoDimensionsChecked = true;
        this.hasExplicitGeoWidth = !!geometryComponent.width;
        this.hasExplicitGeoHeight = !!geometryComponent.height;
      }
      if (!this.hasExplicitGeoWidth) { el.setAttribute('geometry', 'width', width); }
      if (!this.hasExplicitGeoHeight) { el.setAttribute('geometry', 'height', textHeight); }
    }
  }
});

function parseSide (side) {
  switch (side) {
    case 'back':
      return THREE.BackSide;
    case 'double':
      return THREE.DoubleSide;
    default:
      return THREE.FrontSide;
  }
}
