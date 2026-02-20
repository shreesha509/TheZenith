// src/services/jobManager.js

class JobManager {
    constructor() {
        this.jobs = new Map();
    }

    createJob(jobId, jobData) {
        this.jobs.set(jobId, {
            id: jobId,
            ...jobData,
            currentIteration: 0,
            status: 'INITIALIZING',
            timeline: [],
            startTime: Date.now(),
            results: null // this will store results.json format when done
        });
        return this.getJob(jobId);
    }

    getJob(jobId) {
        return this.jobs.get(jobId);
    }

    updateJob(jobId, updates) {
        if (this.jobs.has(jobId)) {
            const job = this.jobs.get(jobId);
            this.jobs.set(jobId, { ...job, ...updates });
        }
    }

    addTimelineEvent(jobId, iteration, status, message = "") {
        if (this.jobs.has(jobId)) {
            const job = this.jobs.get(jobId);
            job.timeline.push({
                iteration,
                status,
                timestamp: new Date().toISOString(),
                message
            });
            job.currentIteration = Math.max(job.currentIteration, iteration);
            job.status = status;
            this.jobs.set(jobId, job);
        }
    }

    completeJob(jobId, results) {
        if (this.jobs.has(jobId)) {
            const job = this.jobs.get(jobId);
            job.status = 'COMPLETED';
            job.results = results;
            this.jobs.set(jobId, job);
        }
    }
}

// Export singleton instance
export const jobManager = new JobManager();
