export type Project<T extends object> = {
    title: string;
    type: "web" | "video"
} & T;