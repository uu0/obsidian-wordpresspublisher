export type PublishStage = 'prepare' | 'media' | 'wordpress' | 'writeback';

export interface PublishProgress {
  stage: PublishStage;
  current?: number;
  total?: number;
  detail?: string;
}

export type PublishProgressReporter = (progress: PublishProgress) => void;
