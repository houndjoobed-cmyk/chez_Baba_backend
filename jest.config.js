export default {
  // Environnement de test
  testEnvironment: 'node',
  
  // Transformation des modules ES6
  transform: {},
  
  // Extensions de fichiers à tester
  moduleFileExtensions: ['js', 'json'],
  
  // Patterns de fichiers de test
  testMatch: [
    '**/__tests__/**/*.test.js',
    '**/?(*.)+(spec|test).js'
  ],
  
  // Dossiers à ignorer
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/'
  ],
  
  // Configuration de coverage
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!src/config/*.js'
  ],
  
  // Seuils de couverture minimums
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  
  // Setup avant les tests
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  
  // Timeout des tests
  testTimeout: 10000,
  
  // Variables d'environnement pour les tests
  testEnvironmentOptions: {
    NODE_ENV: 'test'
  }
};