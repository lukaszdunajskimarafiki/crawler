/**
 * Crawl Queue Manager
 * - Max concurrent crawls: 3
 * - Blocks duplicate domain scans (same domain can't be scanned twice at once)
 * - Queued scans run automatically when a slot opens
 */

import { crawlDomain } from './crawler';
import { prisma } from './prisma';

const MAX_CONCURRENT = 3;

interface QueueItem {
    domainUrl: string;
    domainId: number;
    userAgent: string;
}

class CrawlQueue {
    private running: Map<string, number> = new Map(); // hostname -> domainId
    private queue: QueueItem[] = [];

    /** Check if a domain is currently being crawled */
    isRunning(domainUrl: string): boolean {
        const hostname = new URL(domainUrl).hostname;
        return this.running.has(hostname);
    }

    /** Get the domainId of the currently running crawl for a hostname */
    getRunningId(domainUrl: string): number | undefined {
        const hostname = new URL(domainUrl).hostname;
        return this.running.get(hostname);
    }

    /** Get current queue status */
    getStatus() {
        return {
            running: this.running.size,
            queued: this.queue.length,
            maxConcurrent: MAX_CONCURRENT,
            runningDomains: Array.from(this.running.keys()),
            queuedDomains: this.queue.map(q => new URL(q.domainUrl).hostname),
        };
    }

    /** Add a crawl job — runs immediately if slots available, otherwise queues */
    async add(domainUrl: string, domainId: number, userAgent: string): Promise<'started' | 'queued'> {
        if (this.running.size < MAX_CONCURRENT) {
            await this.startCrawl({ domainUrl, domainId, userAgent });
            return 'started';
        } else {
            // Update domain status to 'queued'
            await prisma.domain.update({
                where: { id: domainId },
                data: { status: 'queued' }
            });
            this.queue.push({ domainUrl, domainId, userAgent });
            console.log(`[Queue] Crawl queued for ${domainUrl} (${this.queue.length} in queue, ${this.running.size}/${MAX_CONCURRENT} running)`);
            return 'queued';
        }
    }

    private async startCrawl(item: QueueItem) {
        const hostname = new URL(item.domainUrl).hostname;
        this.running.set(hostname, item.domainId);
        console.log(`[Queue] Starting crawl for ${item.domainUrl} (${this.running.size}/${MAX_CONCURRENT} slots used)`);

        try {
            await crawlDomain(item.domainUrl, item.domainId, item.userAgent);
        } catch (err) {
            console.error(`[Queue] Crawl failed for ${item.domainUrl}:`, err);
        } finally {
            this.running.delete(hostname);
            console.log(`[Queue] Finished ${item.domainUrl} (${this.running.size}/${MAX_CONCURRENT} slots used, ${this.queue.length} queued)`);
            this.processNext();
        }
    }

    private async processNext() {
        while (this.queue.length > 0 && this.running.size < MAX_CONCURRENT) {
            const next = this.queue.shift()!;
            const hostname = new URL(next.domainUrl).hostname;

            // Skip if same hostname is already running (edge case)
            if (this.running.has(hostname)) {
                this.queue.push(next); // put back at end
                break;
            }

            await this.startCrawl(next);
        }
    }
}

// Singleton
export const crawlQueue = new CrawlQueue();
