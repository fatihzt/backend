
export interface ProviderEvent {
    title: string;
    description: string;
    location: string;
    city: string;
    category: string;
    image_url?: string;
    start_time: string;
    end_time?: string;
    source: string;
    external_id?: string;
    lat?: number;
    lng?: number;
}

export interface IEventProvider {
    name: string;
    fetchEvents(city?: string): Promise<ProviderEvent[]>;
}
