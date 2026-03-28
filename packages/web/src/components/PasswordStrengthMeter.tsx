import React from 'react';

type Strength = 'Too short' | 'Weak' | 'Fair' | 'Strong';

interface Props {
  password: string;
}

function scorePassword(pw: string) {
  let score = 0;
  if (pw.length >= 12) score += 1;
  if (/[A-Z]/.test(pw)) score += 1;
  if (/[0-9]/.test(pw)) score += 1;
  if (/[^A-Za-z0-9]/.test(pw)) score += 1;
  return score;
}

const PasswordStrengthMeter: React.FC<Props> = ({ password }) => {
  const score = scorePassword(password);
  let strength: Strength = 'Too short';
  let color = 'bg-red-400';

  if (password.length === 0) {
    strength = 'Too short';
    color = 'bg-gray-200';
  } else if (password.length < 12) {
    strength = 'Too short';
    color = 'bg-red-400';
  } else if (score <= 2) {
    strength = 'Weak';
    color = 'bg-red-500';
  } else if (score === 3) {
    strength = 'Fair';
    color = 'bg-yellow-400';
  } else if (score >= 4) {
    strength = 'Strong';
    color = 'bg-green-500';
  }

  const pct = Math.min(100, Math.max(0, (score / 4) * 100));

  return (
    <div className="mt-2" aria-live="polite">
      <div className="w-full h-2 bg-gray-200 rounded">
        <div
          data-testid="pw-strength-bar"
          className={`${color} h-2 rounded transition-all duration-300`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-sm mt-1 text-gray-600">Strength: {strength}</p>
    </div>
  );
};

export default PasswordStrengthMeter;
