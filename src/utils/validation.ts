export const PASSWORD_MIN_LENGTH = 8;

export const passwordRegex = new RegExp(
  `^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&]).{${PASSWORD_MIN_LENGTH},}$`
);

export const getPasswordStrength = (password: string) => {
  let strength = 0;
  const checks = {
    length: password.length >= PASSWORD_MIN_LENGTH,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /\d/.test(password),
    special: /[@$!%*?&]/.test(password),
  };

  if (checks.length) strength += 20;
  if (checks.uppercase) strength += 20;
  if (checks.lowercase) strength += 20;
  if (checks.number) strength += 20;
  if (checks.special) strength += 20;

  return { strength, checks };
};

export const calculateAge = (dateOfBirth: string) => {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age;
};

export default {
  PASSWORD_MIN_LENGTH,
  passwordRegex,
  getPasswordStrength,
  calculateAge,
};
