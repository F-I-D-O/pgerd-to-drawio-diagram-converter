import { type PgErdDiagramInfo } from './pgerd.types';
export interface ConvertPgerdToDrawIoOptions {
    /**
     * When true, node positions are regenerated using an automatic graph layout algorithm.
     * By default the positions from the pgerd file are preserved.
     */
    regenerateLayout?: boolean;
    /**
     * Width of the generated draw.io tables in pixels.
     * Defaults to 180, the fixed table width used by pgAdmin.
     */
    tableWidth?: number;
    /**
     * When true, table headers show only the table name without the schema prefix.
     */
    hideSchema?: boolean;
}
export declare function convertPgerdToDrawIo(pgDiagram: PgErdDiagramInfo, options?: ConvertPgerdToDrawIoOptions): string;
