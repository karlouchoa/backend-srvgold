import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { Role } from '../auth/enums/role.enum';

export type SyncEntityCategory = 'cadastro' | 'movimentacao';

export interface SyncEntityConfig {
  slug: string;
  model: string;
  category: SyncEntityCategory;
  readRoles: Role[];
  writeRoles: Role[];
  aliases: string[];
  fields: string[];
  updatedField?: string;
  deletedAtField?: string;
  deletedFlagField?: string;
}

interface SchemaModel {
  name: string;
  fields: string[];
}

const CADASTRO_TARGETS = [
  't_itens',
  't_gritens',
  't_subgr',
  't_formulas',
  't_emp',
  't_for',
  't_cli',
  't_users',
  't_motoristas',
  't_vende',
  't_cst',
  't_cfop',
  't_bco',
  't_tpgto',
  't_fpgto',
  't_fpgto2',
  't_placon',
  't_equip',
  't_equipcli',
  't_equipamento',
  't_especialidade',
  't_frota',
  't_funcionario',
  't_imovel',
  't_clasfis',
  't_config',
  't_custocid',
];

const MOVIMENTACAO_TARGETS = [
  't_vendas',
  't_itsven',
  't_comanda',
  't_comandait',
  't_cclasstrib',
  't_caracteristica',
  't_acessequip',
  't_automovel',
  't_acessorio',
  't_cargo',
  't_locacao',
  't_locacaochk',
  't_lancapicms',
  't_lancappiscofins',
  't_cxabe',
  't_pgcaixa',
  't_cxdoc',
  't_pag',
  't_pagb',
  't_rec',
  't_recb',
  't_fluxocx',
  't_debcrecli',
  't_movest',
  't_nfs',
  't_itnfs',
  't_pdc',
  't_itpdc',
  't_pedcmp',
  't_itpedcmp',
  't_comven',
  't_lotes',
  't_lote',
  't_loteenv',
  't_lvsai',
  't_lvsaiitem',
  't_lvent',
  't_lventitem',
  't_lventref',
  't_formacao',
  't_orc',
  't_itorc',
  't_marca',
  't_marcaautomovel',
  't_midia',
  't_motcham',
  't_obs',
  't_obsagup',
  't_os',
  't_ositens',
  't_zona',
  't_visitas',
  't_visitascli',
  't_veiculos',
  't_usere',
  't_usersn',
  't_undmed',
  't_cid',
  't_uf',
  't_bai',
  't_baixaloc',
  't_transf',
  't_ittransf',
  't_tipoequipamento',
  't_tecnico',
  't_serv',
  't_socio',
  't_solicitacao',
  't_rotatec',
  't_rotatecit',
  't_saldoit',
  't_romfre',
  't_romret',
  't_req',
  't_itsreq',
  't_reqven',
  't_retbco',
  't_rettit',
  't_reg_producao',
  't_recrepa',
  't_recprorrog',
  't_reclot',
  't_recibo',
  't_reclacli',
  't_receitas',
  't_proc',
  't_procreclacli',
  't_printers',
  't_pedimport',
  't_pedidos_fab',
  't_pagbfunc',
  't_pagbfuncb',
  't_outroslan',
  't_outroslanfiscais',
  't_mputilizada',
  't_modelo',
  't_modeloautomovel',
];

const SPECIAL_ALIASES: Record<string, string[]> = {
  t_itens: ['items'],
  t_vendas: ['sales'],
  t_pedcmp: ['purchases'],
  t_pagb: ['payables'],
  t_rec: ['receivables'],
};

const OFFICE_MOV_MODELS = new Set([
  't_pedcmp',
  't_pagb',
  't_pag',
  't_pagbfunc',
  't_pagbfuncb',
]);

const PDV_MOV_MODELS = new Set([
  't_vendas',
  't_itsven',
  't_nfs',
  't_itnfs',
  't_comanda',
  't_comandait',
]);

const schemaModels = loadSchemaModels();
const schemaModelMap = new Map(schemaModels.map((model) => [model.name.toLowerCase(), model]));

function loadSchemaModels(): SchemaModel[] {
  const schemaPath = join(process.cwd(), 'prisma', 'schema.prisma');
  if (!existsSync(schemaPath)) {
    throw new Error(`schema.prisma não encontrado em ${schemaPath}`);
  }

  const content = readFileSync(schemaPath, 'utf8');
const modelRegex = /model\s+(\w+)\s*\{([\s\S]*?)\n?\}/g;
  const models: SchemaModel[] = [];
  let match: RegExpExecArray | null;

  while ((match = modelRegex.exec(content)) !== null) {
    const [, name, body] = match;
    const fields = extractFieldNames(body);
    models.push({ name, fields });
  }

  return models;
}

function extractFieldNames(body: string): string[] {
  const fieldRegex = /^\s*([A-Za-z0-9_]+)\s+/gm;
  const fields: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = fieldRegex.exec(body)) !== null) {
    const fieldName = match[1];
    if (fieldName.startsWith('@@')) {
      continue;
    }
    fields.push(fieldName);
  }

  return fields;
}

function normalizeTarget(name: string): string {
  return name
    .toLowerCase()
    .replace(/\(.*?\)/g, '')
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/__+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function createSlug(modelName: string): string {
  return modelName
    .replace(/^t_/i, '')
    .replace(/^t/i, '')
    .toLowerCase()
    .replace(/_+/g, '-');
}

function resolveField(model: SchemaModel, candidates: string[]): string | undefined {
  const fieldMap = new Map(model.fields.map((field) => [field.toLowerCase(), field]));
  for (const candidate of candidates) {
    const normalized = candidate.toLowerCase();
    if (fieldMap.has(normalized)) {
      return fieldMap.get(normalized);
    }
  }
  return undefined;
}

function resolveFieldByIncludes(model: SchemaModel, substrings: string[]): string | undefined {
  const fields = model.fields;
  for (const field of fields) {
    const normalized = field.toLowerCase();
    if (substrings.some((substring) => normalized.includes(substring))) {
      return field;
    }
  }
  return undefined;
}

function buildConfig(target: string, category: SyncEntityCategory): SyncEntityConfig | null {
  const normalized = normalizeTarget(target);
  const model = schemaModelMap.get(normalized);

  if (!model) {
    return null;
  }

  const slug = createSlug(model.name);
  const aliases = SPECIAL_ALIASES[model.name as keyof typeof SPECIAL_ALIASES] ?? [];

  const updatedField =
    resolveField(model, ['updatedat', 'UpdatedAt', 'updated_at', 'dtalteracao', 'dtalt', 'dtaltuse', 'dtaltven']) ??
    resolveFieldByIncludes(model, ['updated', 'alter']);

  const deletedAtField =
    resolveField(model, ['deletedat', 'DeletedAt', 'deleted_at']) ?? resolveFieldByIncludes(model, ['deletedat']);

  const deletedFlagField =
    resolveField(model, ['isdeleted', 'IsDeleted', 'is_deleted']) ?? resolveFieldByIncludes(model, ['isdeleted']);

  const readRoles = [Role.ADMIN, Role.OFFICE, Role.PDV];
  const writeRolesSet = new Set<Role>([Role.ADMIN]);

  if (category === 'cadastro') {
    writeRolesSet.add(Role.OFFICE);
  } else {
    const modelNameLower = model.name.toLowerCase();
    if (OFFICE_MOV_MODELS.has(modelNameLower)) {
      writeRolesSet.add(Role.OFFICE);
    }
    if (PDV_MOV_MODELS.has(modelNameLower)) {
      writeRolesSet.add(Role.PDV);
    }
  }

  const writeRoles = Array.from(writeRolesSet);

  return {
    slug,
    model: model.name,
    category,
    readRoles,
    writeRoles,
    aliases,
    fields: model.fields,
    updatedField,
    deletedAtField,
    deletedFlagField,
  };
}

function buildConfigs() {
  const configs: SyncEntityConfig[] = [];
  const missing: string[] = [];

  for (const target of CADASTRO_TARGETS) {
    const config = buildConfig(target, 'cadastro');
    if (config) {
      configs.push(config);
    } else {
      missing.push(target);
    }
  }

  for (const target of MOVIMENTACAO_TARGETS) {
    const config = buildConfig(target, 'movimentacao');
    if (config) {
      configs.push(config);
    } else {
      missing.push(target);
    }
  }

  if (missing.length > 0) {
    // eslint-disable-next-line no-console
    console.warn(`Entidades não encontradas no schema.prisma: ${missing.join(', ')}`);
  }

  return configs;
}

export const SYNC_ENTITY_CONFIGS = buildConfigs();
const lookup = new Map<string, SyncEntityConfig>();

for (const config of SYNC_ENTITY_CONFIGS) {
  lookup.set(config.slug.toLowerCase(), config);
  lookup.set(config.model.toLowerCase(), config);
  config.aliases.forEach((alias) => lookup.set(alias.toLowerCase(), config));
}

export function resolveSyncEntity(entityKey: string): SyncEntityConfig | undefined {
  return lookup.get(entityKey.toLowerCase());
}
