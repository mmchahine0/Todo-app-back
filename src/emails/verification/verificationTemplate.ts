export const verificationEmailTemplate = (otp: string, CSP_POLICY: string) => `
<!DOCTYPE html>
<html>
  <head>
    <meta http-equiv="Content-Security-Policy" content="${CSP_POLICY}" />
  </head>
  <body style="font-family: Arial, sans-serif">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px">
      <h2 style="color: #1a73e8">Account Verification</h2>
      <p>Your verification code is:</p>
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
        ${otp}
      </div>
      <p>This code will expire in 15 minutes.</p>
      <hr style="border: 1px solid #e0e0e0" />
      <p style="color: #5f6368">
        If you didn't request this code, you can safely ignore this email.
      </p>
    </div>
  </body>
</html>
`;
