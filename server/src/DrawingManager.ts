import { StrokeData } from './types';

export class DrawingManager {
  private strokes: StrokeData[] = [];

  public addStroke(stroke: StrokeData): void {
    this.strokes.push(stroke);
  }

  public undo(): StrokeData | null {
    if (this.strokes.length === 0) return null;
    return this.strokes.pop() || null;
  }

  public clear(): void {
    this.strokes = [];
  }

  public getHistory(): StrokeData[] {
    return [...this.strokes];
  }

  public reset(): void {
    this.strokes = [];
  }
}
