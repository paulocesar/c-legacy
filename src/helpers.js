module.exports = {
    findRegexIntervals(regex, str) {
        let match = null;
        const intervals = [ ];

        while((match = regex.exec(str)) !== null) {
            intervals.push({
                start: match.index,
                end: match.index + match[0].length - 1
            });
        }

        return intervals;
    },

    inIntervals(intervals, x) {
        for (const { start, end } of intervals) {
            if (x >= start && x <= end) { return true; }
        }

        return false;
    }
};
