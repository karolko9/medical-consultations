export enum PersistenceMode {
  LOCAL = 'LOCAL',
  SESSION = 'SESSION',
  NONE = 'NONE'
}

export interface PersistenceConfig {
  mode: PersistenceMode;
  lastModified: Date;
  modifiedBy: string;
}
