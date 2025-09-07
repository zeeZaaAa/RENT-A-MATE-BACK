export const isMateSetupComplete = (mate) => {
  const requiredFields = [
    "skill",
    "avaliable_date",
    "avaliable_time",
    "interest",
    "introduce",
    "price_rate",
    "city",
  ];

  for (const field of requiredFields) {
    if (
      !mate[field] || 
      (Array.isArray(mate[field]) && mate[field].length === 0) || 
      (typeof mate[field] === "string" && !mate[field].trim())
    ) {
      return false;
    }
  }
  return true;
};