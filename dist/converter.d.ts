import { type PgErdDiagramInfo } from './pgerd.types';
export interface ConvertPgerdToDrawIoOptions {
    /**
     * When true, node positions are regenerated using an automatic graph layout algorithm.
     * By default the positions from the pgerd file are preserved.
     */
    regenerateLayout?: boolean;
}
export declare function convertPgerdToDrawIo(pgDiagram: PgErdDiagramInfo, options?: ConvertPgerdToDrawIoOptions): string;
