export const resetTemplate = (code: string, CSP_POLICY: string) =>
  `
<!DOCTYPE html>
<html>
  <head>
    <meta http-equiv="Content-Security-Policy" content="${CSP_POLICY}" />
  </head>
  <body style="font-family: Arial, sans-serif">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px">
      <h2 style="color: #1a73e8">Password Reset Request</h2>
      <p>Your password reset code is:</p>
      <div
        style="
          font-size: 24px;
          font-weight: bold;
          margin: 20px 0;
          padding: 10px;
          background: #f8f9fa;
          display: inline-block;
        "
      >
        ${code}
      </div>
      <p>This code will expire in 15 minutes.</p>
      <hr style="border: 1px solid #e0e0e0" />
      <p style="color: #5f6368">
        If you didn't request this password reset, please secure your account
        immediately.
      </p>
    </div>
  </body>
</html>
`;
