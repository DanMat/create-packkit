// React component-library support: react/react-dom as peers (so consumers bring
// their own), plus dev copies for building and testing. tsup/rollup externalize
// peerDependencies automatically, so React is never bundled into your package.

export default {
  id: 'react',
  active: (cfg) => cfg.isReact,
  apply(cfg) {
    const pkg = {
      peerDependencies: {
        react: '>=18',
        'react-dom': '>=18',
      },
      devDependencies: {
        react: '^18.3.0',
        'react-dom': '^18.3.0',
      },
    };
    if (cfg.isTs) {
      pkg.devDependencies['@types/react'] = '^18.3.0';
      pkg.devDependencies['@types/react-dom'] = '^18.3.0';
    }
    return { files: {}, pkg };
  },
};
