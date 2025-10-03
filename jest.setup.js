// Add custom jest matchers from jest-dom
// import '@testing-library/jest-dom'

// Mock environment variables for tests
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.AUTH_JWT_SECRET = 'test-secret-key-for-jwt-signing-min-32-chars';
process.env.REQUIRE_AUTH = 'false';
process.env.NODE_ENV = 'test';
