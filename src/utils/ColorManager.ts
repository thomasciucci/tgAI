export interface GroupColor {
  color: string;
  label: string;
}

export class ColorManager {
  private static instance: ColorManager;
  private groupColors: Map<string, string> = new Map();
  private defaultColors: string[] = [
    '#1f77b4', // Blue
    '#ff7f0e', // Orange
    '#2ca02c', // Green
    '#d62728', // Red
    '#9467bd', // Purple
    '#8c564b', // Brown
    '#e377c2', // Pink
    '#7f7f7f', // Gray
    '#bcbd22', // Olive
    '#17becf'  // Cyan
  ];
  private colorIndex: number = 0;

  private constructor() {}

  public static getInstance(): ColorManager {
    if (!ColorManager.instance) {
      ColorManager.instance = new ColorManager();
    }
    return ColorManager.instance;
  }

  public getColor(groupName: string): string {
    if (!this.groupColors.has(groupName)) {
      const color = this.defaultColors[this.colorIndex % this.defaultColors.length];
      this.groupColors.set(groupName, color);
      this.colorIndex++;
    }
    return this.groupColors.get(groupName)!;
  }

  public setColor(groupName: string, color: string): void {
    this.groupColors.set(groupName, color);
  }

  public getAllColors(): Map<string, string> {
    return new Map(this.groupColors);
  }

  public getGroupsWithColors(): { group: string; color: string }[] {
    return Array.from(this.groupColors.entries()).map(([group, color]) => ({
      group,
      color
    }));
  }

  public reset(): void {
    this.groupColors.clear();
    this.colorIndex = 0;
  }

  public getAvailableColors(): string[] {
    return [...this.defaultColors];
  }
}

export const colorManager = ColorManager.getInstance();