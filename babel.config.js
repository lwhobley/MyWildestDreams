module.exports = function (api) {
  api.cache(false)
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            '@/stores': './src/stores',
            '@/types': './src/types',
            '@/lib': './src/lib',
            '@/hooks': './src/hooks',
          },
          extensions: ['.ts', '.tsx', '.js', '.jsx'],
        },
      ],
    ],
  }
}
