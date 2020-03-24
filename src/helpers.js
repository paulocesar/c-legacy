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
        return Boolean(this.getInterval(intervals, x));
    },

    getInterval(intervals, x) {
        for (const { start, end } of intervals) {
            if (x >= start && x <= end) { return { start, end }; }
        }

        return null;
    },

    getIntervalIndex(intervals, x) {
        for (let i = 0; i < intervals.length; i++) {
            const { start, end } = intervals[i];
            if (x >= start && x <= end) { return i; }
        }

        return null;
    },

    splitIntervals(intervals, rule) {
        const results = [ [ ], [ ] ];
        for (const i of intervals) {
            const idx = rule(i) ? 1 : 0;
            results[idx].push(i);
        }
        return results;
    }
};
