const WORKSHOP_EMAIL_CONTENT = `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6;">
    <div style="text-align: center; margin-bottom: 20px; background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 50%, #1e40af 100%); padding: 20px; border-radius: 12px;">
      <img src="https://unrealstudioz.in/assets/UNREALLOGO-DfmVor3b.png" alt="Unreal Studioz Logo" style="max-width: 200px; height: auto;">
    </div>
    <p><strong>Dear Sir/Madam,</strong></p>
    <p>Greetings from Unreal.</p>
    <p>We are reaching out to collaborate with your institution for providing <strong>placement support and job opportunities</strong> to your students through our centralized Job Engine platform.</p>\n    <p>We would like to support your students with placement opportunities</p>\n    <p>Unreal aggregates and filters fresher and internship opportunities from multiple platforms including LinkedIn, Indeed, and Naukri, ensuring students receive relevant and verified job openings.</p>
    <h3 style="color: #13294B;">What We Offer:</h3>
    <ul>
      <li>Access to curated fresher and internship opportunities</li>
      <li>Centralized job updates for students</li>
      <li>Shortlisting and interview coordination support</li>
      <li>Placement drive assistance (virtual/offline)</li>
    </ul>
    <h3 style="color: #13294B;">Focus Areas:</h3>
    <ul>
      <li>Web Development (React, Node.js, MERN Stack)</li>
      <li>Software Development Roles</li>
      <li>Entry-level IT & Tech Positions</li>
    </ul>
    <h3 style="color: #13294B;">Target Students:</h3>
    <p>Final Year (B.Tech / BCA / MCA / Diploma)</p>
    <p>We aim to simplify the placement process and help institutions improve their placement outcomes.</p>
    <p>Please click the button below to submit your placement details:</p>
    <div>
      <a href="{{inviteLink}}" style="background:#2563eb; color:#ffffff; padding:14px 28px; text-decoration:none; border:none; border-radius:6px; font-size:15px; font-weight:500; cursor:pointer; display:inline-block;">
Share Details
      </a>
      <p style="margin-top:10px; font-size:13px; color:#666;">
        <a href="{{inviteLink}}" style="color:#2563eb; text-decoration:underline;">Or click here</a> if button doesn\'t work
      </p>\n    </div>\n    <p>We will coordinate directly with your Training & Placement Officer once details are shared.</p>
    <p>Looking forward to your response.</p>
    <p>Warm regards,<br>Team Unreal</p>
    <div style="margin-top: 30px; background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 50%, #1e40af 100%); padding: 20px; border-radius: 12px; color: white;">
      <p style="margin: 0 0 8px 0; font-size: 16px; font-weight: 500;">
        📞 +91-9910075663 | ✉️ Info@unrealstudioz.in
      </p>
      <p style="margin: 0; font-size: 14px; opacity: 0.9;">
        <a href="https://unrealstudioz.in" style="color: white; text-decoration: none;">www.unrealstudioz.in</a> | Follow us on LinkedIn
      </p>
    </div>
  </div>
`;

const GUEST_LECTURE_EMAIL_CONTENT = `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6;">
    <div style="text-align: center; margin-bottom: 20px; background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 50%, #1e40af 100%); padding: 20px; border-radius: 12px;">
      <img src="https://unrealstudioz.in/assets/UNREALLOGO-DfmVor3b.png" alt="Unreal Studioz Logo" style="max-width: 200px; height: auto;">
    </div>
    <p><strong>Dear Sir/Madam,</strong></p>
<p>Greetings from Unreal.</p>\n    <p>Following our previous communication regarding the workshop</p>\n    <p>We would like to offer a <strong>Guest Lecture session</strong>
    <p>The session is designed to provide students with clarity on how to prepare effectively for internships and job opportunities in today's competitive environment.</p>
    <h3 style="color: #13294B;">Key Topics Covered:</h3>
    <ul>
      <li>Current industry trends and in-demand skills</li>
      <li>How students can prepare for placements from early stages</li>
      <li>Resume building and interview preparation</li>
      <li>Common mistakes students make during placements</li>
      <li>Live Q&A session with industry experts</li>
    </ul>
    <h3 style="color: #13294B;">Target Audience:</h3>
    <p>Final Year & Pre-final Year Students (B.Tech / BCA / MCA / Diploma)</p>
    <h3 style="color: #13294B;">Duration:</h3>
    <p>60–90 Minutes</p>
    <p>This session will help students gain practical insights and direction for their career path.</p>
    <p>We would be honored to conduct this session at your institution.</p>\n    <p><strong>We are scheduling limited sessions this month</strong></p>\n    <p>Looking forward to your response.</p>
    <p>Warm regards,<br>Team Unreal</p>
    <div style="margin-top: 30px; background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 50%, #1e40af 100%); padding: 20px; border-radius: 12px; color: white;">
      <p style="margin: 0 0 8px 0; font-size: 16px; font-weight: 500;">
        📞 +91-9910075663 | ✉️ Info@unrealstudioz.in
      </p>
      <p style="margin: 0; font-size: 14px; opacity: 0.9;">
        <a href="https://unrealstudioz.in" style="color: white; text-decoration: none;">www.unrealstudioz.in</a> | Follow us on LinkedIn
      </p>
    </div>
  </div>
`;

const PLACEMENT_DRIVE_EMAIL_CONTENT = `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6;">
    <div style="text-align: center; margin-bottom: 20px; background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 50%, #1e40af 100%); padding: 20px; border-radius: 12px;">
      <img src="https://unrealstudioz.in/assets/UNREALLOGO-DfmVor3b.png" alt="Unreal Studioz Logo" style="max-width: 200px; height: auto;">
    </div>
    <p><strong>Dear \${name},</strong></p>\n    <p>Greetings from Unreal.</p>\n    <p>After conducting workshops/interaction sessions…</p>\n    <p>We are reaching out to collaborate with your institution for providing <strong>placement support and job opportunities</strong> to your students through our centralized Job Engine platform.</p>
    <p>Unreal aggregates and filters fresher and internship opportunities from multiple platforms including LinkedIn, Indeed, and Naukri, ensuring students receive relevant and verified job openings.</p>
    <h3 style="color: #13294B;">What We Offer:</h3>
    <ul>
      <li>Access to curated fresher and internship opportunities</li>
      <li>Centralized job updates for students</li>
      <li>Shortlisting and interview coordination support</li>
      <li>Placement drive assistance (virtual/offline)</li>
    </ul>
    <h3 style="color: #13294B;">Focus Areas:</h3>
    <ul>
      <li>Web Development (React, Node.js, MERN Stack)</li>
      <li>Software Development Roles</li>
      <li>Entry-level IT & Tech Positions</li>
    </ul>
    <h3 style="color: #13294B;">Target Students:</h3>
    <p>Final Year (B.Tech / BCA / MCA / Diploma)</p>
    <p>We aim to simplify the placement process and help institutions improve their placement outcomes.</p>
    <p>We would be glad to connect with your Training & Placement Officer to take this forward.</p>
    <p>Looking forward to your response.</p>
    <p>Warm regards,<br>Team Unreal</p>
    <div style="margin-top: 30px; background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 50%, #1e40af 100%); padding: 20px; border-radius: 12px; color: white;">
      <p style="margin: 0 0 8px 0; font-size: 16px; font-weight: 500;">
        📞 +91-9910075663 | ✉️ Info@unrealstudioz.in
      </p>
      <p style="margin: 0; font-size: 14px; opacity: 0.9;">
        <a href="https://unrealstudioz.in" style="color: white; text-decoration: none;">www.unrealstudioz.in</a> | Follow us on LinkedIn
      </p>
    </div>
  </div>
`;

module.exports = {
  WORKSHOP_EMAIL_CONTENT,
  GUEST_LECTURE_EMAIL_CONTENT
};

