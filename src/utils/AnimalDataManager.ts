export interface Measurement {
  studyDay: number;
  date?: string;
  measurements: Record<string, number | string | null>;
}

export interface AnimalRecord {
  animalId: string;
  group?: string;
  strain?: string;
  sex?: string;
  measurements: Measurement[];
}

export class AnimalDataManager {
  animals: Map<string, AnimalRecord>;

  constructor() {
    this.animals = new Map();
  }

  // Consolidate data from raw rows (array of objects)
  consolidateData(rawRows: Record<string, any>[]) {
    rawRows.forEach(row => {
      const animalId = row.Animal_ID || row.AnimalID || row.animalId;
      if (!animalId) return;
      if (!this.animals.has(animalId)) {
        this.animals.set(animalId, {
          animalId,
          group: row.Group || row.Treatment_Group,
          strain: row.Strain,
          sex: row.Sex,
          measurements: []
        });
      }
      this.addMeasurement(animalId, row);
    });
  }

  addMeasurement(animalId: string, row: Record<string, any>) {
    const animal = this.animals.get(animalId);
    if (!animal) return;
    const studyDay = parseInt(row.Study_Day || row.Day || row.studyDay);
    if (isNaN(studyDay)) return;
    let measurement = animal.measurements.find(m => m.studyDay === studyDay);
    if (!measurement) {
      measurement = {
        studyDay,
        date: row.Date || row.Measurement_Date,
        measurements: {}
      };
      animal.measurements.push(measurement);
    }
    // Add all measurement values
    Object.keys(row).forEach(key => {
      if (!['Animal_ID','AnimalID','animalId','Study_Day','Day','studyDay','Date','Measurement_Date'].includes(key)) {
        const value = parseFloat(row[key]);
        if (!isNaN(value)) {
          measurement!.measurements[key] = value;
        } else if (row[key] !== undefined && row[key] !== null && row[key] !== '') {
          measurement!.measurements[key] = row[key];
        }
      }
    });
    // Sort by study day
    animal.measurements.sort((a, b) => a.studyDay - b.studyDay);
  }

  getAnimalData(animalId: string): AnimalRecord | undefined {
    return this.animals.get(animalId);
  }

  getAllAnimals(): AnimalRecord[] {
    return Array.from(this.animals.values());
  }

  // Get timeline for a specific parameter (e.g., tumorVolume) for an animal
  getParameterTimeline(animalId: string, parameter: string) {
    const animal = this.animals.get(animalId);
    if (!animal) return [];
    return animal.measurements
      .filter(m => m.measurements[parameter] !== undefined)
      .map(m => ({
        studyDay: m.studyDay,
        date: m.date,
        value: m.measurements[parameter]
      }));
  }
} 