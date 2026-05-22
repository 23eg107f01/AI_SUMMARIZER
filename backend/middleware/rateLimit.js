const requestsByIp = new Map();

module.exports = function rateLimit(req, res, next) {
  const ip = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
  const now = Date.now();
  const record = requestsByIp.get(ip);

  if (!record) {
    const timer = setTimeout(() => {
      requestsByIp.delete(ip);
    }, 60_000);

    if (typeof timer.unref === 'function') {
      timer.unref();
    }

    requestsByIp.set(ip, {
      count: 1,
      createdAt: now,
      timer,
    });

    return next();
  }

  if (now - record.createdAt >= 60_000) {
    clearTimeout(record.timer);
    const timer = setTimeout(() => {
      requestsByIp.delete(ip);
    }, 60_000);

    if (typeof timer.unref === 'function') {
      timer.unref();
    }

    requestsByIp.set(ip, {
      count: 1,
      createdAt: now,
      timer,
    });

    return next();
  }

  if (record.count >= 10) {
    return res.status(429).json({ error: 'Too many requests. Please wait a minute.' });
  }

  record.count += 1;
  requestsByIp.set(ip, record);
  return next();
};