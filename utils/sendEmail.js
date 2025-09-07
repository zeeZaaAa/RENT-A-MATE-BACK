import nodemailer from "nodemailer";

export const sendEmail = async (to, verifyLink) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: `"RENT A MATE" <${process.env.EMAIL_USER}>`,
      to,
      subject: "Verify your email - RENT A MATE",
      html: `
      <h2>Please verify your email</h2>
      <p>Click the link below to verify your email address:</p>
      <a href="${verifyLink}">${verifyLink}</a>
      <p>This link expires in 5 minutes.</p>
    `,
    };

    await transporter.sendMail(mailOptions);
    console.log("Verify email sent to", to);
  } catch (error) {
    console.error("Failed to send email:", error);
    throw new Error("Failed to send email");
  }
};
