import { useState } from 'react';
import zxcvbn from 'zxcvbn';

const strengthColors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-400', 'bg-green-400', 'bg-green-600'];
const strengthLabels = ['Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'];

const PasswordStrengthChecker = ({defaultPassword}: {defaultPassword?:string}) => {
  const [password, setPassword] = useState('');

  let result;
  if(defaultPassword){
     result  = zxcvbn(defaultPassword);
    } else {
    result  = zxcvbn(password);

  }


  return (
    <div className="w-full mx-auto p-6 rounded-lg bg-white space-y-4">
      <h2 className="text-2xl font-bold">🔐 Password Strength Checker</h2>

      <input
        disabled={defaultPassword ? true : false}
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Enter your password"
        className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring focus:border-blue-500"
      />

      {(password || defaultPassword) && (
        <>
          {/* Score bar */}
          <div className="space-y-2">
            <label className="block font-medium">Strength: {strengthLabels[result.score]}</label>
            <div className="flex space-x-1">
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className={`h-2 flex-1 rounded ${i <= result.score ? strengthColors[result.score] : 'bg-gray-200'}`}
                />
              ))}
            </div>
          </div>

          {/* Feedback */}
          <div className="text-sm text-gray-600">
            {result.feedback.warning && <p className="text-red-600 font-medium">⚠ {result.feedback.warning}</p>}
            {result.feedback.suggestions.length > 0 && (
              <ul className="list-disc pl-5 mt-1">
                {result.feedback.suggestions.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            )}
          </div>

          {/* Guesses and Crack Times */}
          <div className="grid grid-cols-2 gap-4 text-sm mt-4">
            <div>
              <p className="font-semibold">Estimated Guesses:</p>
              <p>{result.guesses.toLocaleString()}</p>
            </div>
            <div>
              <p className="font-semibold">Crack Time (offline fast hash):</p>
              <p>{result.crack_times_display.offline_fast_hashing_1e10_per_second}</p>
            </div>
            <div>
              <p className="font-semibold">Crack Time (online throttling):</p>
              <p>{result.crack_times_display.online_throttling_100_per_hour}</p>
            </div>
            <div>
              <p className="font-semibold">Crack Time (online no throttling):</p>
              <p>{result.crack_times_display.online_no_throttling_10_per_second}</p>
            </div>
          </div>

          {/* Pattern Matches */}
          {result.sequence.length > 0 && (
            <div className="mt-4 text-sm">
              <p className="font-semibold mb-1">Detected Patterns:</p>
              <ul className="list-disc pl-5">
                {result.sequence.map((seq, i) => (
                  <li key={i}>
                    <span className="font-medium">{seq.pattern}</span>: {seq.token}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PasswordStrengthChecker;
