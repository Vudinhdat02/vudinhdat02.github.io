// Cho phép người xem đổi cỡ chữ: mọi cỡ chữ nhân với biến --fs (mặc định 1).
const scale = (v) => v.replace(/(-?\d*\.?\d+)(px|rem)\b/g, 'calc($1$2 * var(--fs, 1))');

export default {
  plugins: [{
    postcssPlugin: 'font-scale',
    Declaration(decl) {
      if ((decl.prop === 'font-size' || decl.prop === 'font') && !decl.value.includes('var(--fs')) decl.value = scale(decl.value);
    },
  }],
};
