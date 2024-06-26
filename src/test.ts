// Creates a dummy file
function createDummyFile(file: File): File {
    function createDummyFile(file: File): File {
  const dummyFile = new File([''], file.name, {
    type: file.type,
    lastModified: file.lastModified,
  });

  return dummyFile;
}

bluredFilter

export class BluredFilter {
    private readonly canvas: HTMLCanvasElement;
    private readonly context: CanvasRenderingContext2D;
    private readonly image: HTMLImageElement;

    constructor(image: HTMLImageElement) {
        this.image = image;
        this.canvas = document.createElement('canvas');
        this.context = this.canvas.getContext('2d')!;
        this.canvas.width = this.image.width;
        this.canvas.height = this.image.height;
        this.context.drawImage(this.image, 0, 0);
    }

    public blur(radius: number): void {
        this.context.globalAlpha = 0.5;
        this.context.beginPath();
        this.context.arc(this.image.width / 2, this.image.height / 2, radius, 0, Math.PI * 2, true);
        this.context.fill();
    }

    public getImageData(): ImageData {
        return this.context.getImageData(0, 0, this.image.width, this.image.height);
    }
}