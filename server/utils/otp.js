function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit code
}

function generateReference(prefix = 'VLT') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
}

function generateReferralCode(name) {
  const base = name.split(' ')[0].toUpperCase().substring(0, 5);
  return `${base}${Math.floor(1000 + Math.random() * 9000)}`;
}

module.exports = { generateOtp, generateReference, generateReferralCode };
