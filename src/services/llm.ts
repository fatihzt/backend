
export class LLMService {
    // Simulate an LLM categorization based on keywords
    // In the future, this will call: openai.chat.completions.create(...)
    static categorize(title: string, description: string): string {
        const text = (title + ' ' + description).toLowerCase();

        if (text.includes('concert') || text.includes('konser') || text.includes('live music') || text.includes('jazz')) return 'Concert';
        if (text.includes('theater') || text.includes('tiyatro') || text.includes('oyun') || text.includes('stage')) return 'Theater';
        if (text.includes('standup') || text.includes('comedy') || text.includes('komedi')) return 'Standup';
        if (text.includes('cinema') || text.includes('movie') || text.includes('film') || text.includes('sinema')) return 'Cinema';
        if (text.includes('opera') || text.includes('ballet') || text.includes('bale')) return 'Opera';
        if (text.includes('sport') || text.includes('match') || text.includes('futbol') || text.includes('basketbol')) return 'Sports';
        if (text.includes('festival') || text.includes('şenlik')) return 'Festival';
        if (text.includes('tech') || text.includes('ai') || text.includes('coding') || text.includes('yazılım')) return 'Technology';
        if (text.includes('sergi') || text.includes('art') || text.includes('sanat') || text.includes('exhibition')) return 'Art';

        return 'General';
    }

    /**
     * Checks if two events are likely the same.
     * In a real app, this would send both event pairs to an LLM.
     */
    static async isDuplicate(event1: any, event2: any): Promise<boolean> {
        // Similarity check logic:
        // 1. If titles are 80%+ similar and dates match, it's a duplicate.
        // 2. If one title contains the other and dates match.

        const t1 = event1.title.toLowerCase();
        const t2 = event2.title.toLowerCase();

        // Simple fuzzy overlap check
        const overlap = (s1: string, s2: string) => {
            const words1 = new Set(s1.split(' '));
            const words2 = new Set(s2.split(' '));
            const intersection = new Set([...words1].filter(x => words2.has(x)));
            return (intersection.size / Math.max(words1.size, words2.size)) > 0.6;
        };

        const dateMatch = new Date(event1.start_time).getTime() === new Date(event2.start_time).getTime();

        if (dateMatch && (t1.includes(t2) || t2.includes(t1) || overlap(t1, t2))) {
            return true;
        }

        return false;
    }
}
