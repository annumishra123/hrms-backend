const Attendance = require('../models/Attendance');
const { todayStr } = require('../utils/date');

exports.getOrCreateToday = async (employeeId) => {
    const date = todayStr();

    let record = await Attendance.findOne({
        employee: employeeId,
        date
    });

    if (!record) {
        record = await Attendance.create({
            employee: employeeId,
            date
        });
    }

    return record;
};