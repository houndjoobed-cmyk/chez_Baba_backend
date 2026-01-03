export default {
  // Environnement de test
  testEnvironment: 'node',
  
  // Transformation des modules ES6
  transform: {},
  
  // Extensions de fichiers à tester
  moduleFileExtensions: ['js', 'json'],
  
  // Patterns de fichiers de test
  testMatch: [
    '**/tests/**/*.test.js',
    '**/tests/**/*.spec.js'
  ],
  
  // Dossiers à ignorer
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/',
    '/.git/'
  ],
  
  // Configuration de coverage
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!src/config/cloudinary.js',
    '!src/config/monitoring.js'
  ],
  
  // Seuils de coverage minimum
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 80,
      statements: 80
    }
  },
  
  // Setup fichiers
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  
  // Timeout tests
  testTimeout: 10000,
  
  // Verbosité
  verbose: true,
  
  // Détection des handles ouvertes
  detectOpenHandles: true,
  
  // Forcer l'exit après les tests
  forceExit: false,
  
  // Mode bail (arrête au premier test échoué)
  bail: 0
};

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