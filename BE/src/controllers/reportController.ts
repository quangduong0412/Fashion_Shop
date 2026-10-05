import { Request, Response } from 'express';
import { sendApiError } from '../services/apiErrors';
import { retailReport } from '../services/reports';

export async function getRetailReport(req: Request, res: Response) {
  try { res.json(await retailReport(req.query)); }
  catch (error) { sendApiError(res, error); }
}
export const getReport = getRetailReport;
