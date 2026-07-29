
exports.todayStr = () => new Date().toISOString().split('T')[0];


exports.formatTime = (date) => {
    if (!date) return null;
  
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Kolkata',
    });
  };