declare module '@ffmpeg/ffmpeg' {
  export class FFmpeg {
    load(options: { coreURL: string; wasmURL: string; workerURL: string }): Promise<void>;
    on(event: string, callback: (event: any) => void): void;
    writeFile(name: string, data: Uint8Array): Promise<void>;
    readFile(name: string): Promise<Uint8Array>;
    exec(args: string[]): Promise<void>;
  }
}

declare module '@ffmpeg/util' {
  export function toBlobURL(url: string, type: string): Promise<string>;
  export function fetchFile(file: File | string): Promise<Uint8Array>;
}
