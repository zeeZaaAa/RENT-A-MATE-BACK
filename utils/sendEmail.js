import sgMail from "@sendgrid/mail";

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export const sendEmail = async (to, verifyLink) => {
  try {
    const msg = {
      to, // email ของผู้รับ
      from: process.env.EMAIL_USER, // ต้องเป็น verified sender
      subject: "Verify your email - RENT A MATE",
      html: `
        <h2>Please verify your email</h2>
        <p>Click the link below to verify your email address:</p>
        <a href="${verifyLink}">${verifyLink}</a>
        <p>This link expires in 5 minutes.</p>
      `,
    };

    await sgMail.send(msg);
    console.log("Verify email sent to", to);
  } catch (error) {
    console.error("Failed to send email:", error);
    throw new Error("Failed to send email");
  }
};
