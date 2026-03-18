const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Map @/stores, @/types, @/lib → src/ subdirectories
// NOTE: @/hooks intentionally excluded — root hooks/ takes priority via @/* → ./* alias
const srcAliases = {
  '@/stores': path.resolve(__dirname, 'src/stores'),
  '@/types': path.resolve(__dirname, 'src/types'),
  '@/lib': path.resolve(__dirname, 'src/lib'),
};

const originalResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  for (const [alias, aliasPath] of Object.entries(srcAliases)) {
    if (moduleName === alias || moduleName.startsWith(alias + '/')) {
      const resolvedPath = aliasPath + moduleName.slice(alias.length);
      try {
        return (originalResolveRequest || context.resolveRequest)(
          context,
          resolvedPath,
          platform,
        );
      } catch {
        // fall through to default resolution
      }
    }
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
