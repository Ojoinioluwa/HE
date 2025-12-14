// utils/passwordValidator.js

import PasswordValidator from 'password-validator';

// Create schema
const schema = new PasswordValidator();

schema
  .is().min(8)
  .has().lowercase()
  .has().uppercase()
  .has().digits()
  .has().symbols()
  .has().not().spaces();

// Mapping rule names to custom messages
const messagesMap = {
  min: 'Password must be at least 8 characters',
  lowercase: 'Password must contain at least one lowercase letter',
  uppercase: 'Password must contain at least one uppercase letter',
  digits: 'Password must contain at least one number',
  symbols: 'Password must contain at least one symbol',
  spaces: 'Password must not contain spaces',
};

const validatePassword = (password) => {
  const failures = schema.validate(password, { details: true });
  const messages = failures.map(rule => messagesMap[rule.validation] || 'Invalid password');
  return messages;
};

export default validatePassword;
