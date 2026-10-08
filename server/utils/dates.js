// "Today" as YYYY-MM-DD in the campus timezone. Vercel runs in UTC, which would be a day behind in India for the first 5.5 hours of the day.
const TZ = process.env.APP_TIMEZONE || 'Asia/Kolkata';
const today = () => new Date().toLocaleDateString('en-CA', { timeZone: TZ });
module.exports = { today };
