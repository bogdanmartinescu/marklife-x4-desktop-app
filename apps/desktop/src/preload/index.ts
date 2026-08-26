import { contextBridge } from 'electron';
import { thermalBridgeApi } from './api.js';

contextBridge.exposeInMainWorld('thermalBridge', thermalBridgeApi);
