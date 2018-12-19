import {Entity, Model, model, property, hasMany} from '@loopback/repository';
import {PipeFunction} from './pipe-function.model';
import {AbiFunction} from '../interfaces/abi';
import {Devdoc, Userdoc} from '../interfaces/soldocs';

@model()
export class DocumentedContainer extends Model {
    @property({
      type: 'array',
      itemType: 'object',
    })
    abi: AbiFunction[];

    @property({
      type: 'object',
    })
    devdoc: Devdoc;

    @property({
      type: 'object',
    })
    userdoc: Userdoc;
}

@model()
export class SmartContractContainer extends DocumentedContainer {
    @property({
      type: 'object',
    })
    bytecode: object;

    @property({
      type: 'object',
    })
    deployedBytecode: object;

    @property({
      type: 'string',
    })
    metadata: string;

    @property({
      type: 'string',
    })
    solsource: string;

    @property({
      type: 'object',
    })
    additional_solsources?: object;

    @property({
      type: 'string',
    })
    jssource?: string;
}

@model()
export class PythonContainer extends DocumentedContainer {
    @property({
      type: 'string',
    })
    pysource: string;

    @property({
      type: 'string',
    })
    exported: string;
}

@model()
export class JavscriptContainer extends DocumentedContainer {
    @property({
      type: 'string',
    })
    jssource: string;

    @property({
      type: 'string',
    })
    exported: string;
}

@model()
export class OpenApiContainer extends JavscriptContainer {
    @property({
      type: 'string',
    })
    openapiid: string;
}

@model()
export class PipeContainer extends Entity {
  @property({
    type: 'string',
    id: true,
    generated: true,
  })
  _id: string;

  @property({
    type: 'string',
    required: true,
  })
  name: string;

  @property({
    type: 'object',
  })
  container: SmartContractContainer | JavscriptContainer | OpenApiContainer | PythonContainer;

  @property({
    type: 'string',
  })
  uri?: string;

  @hasMany(() => PipeFunction, {keyTo: 'containerid'})
  functions?: PipeFunction[];

  @property({
    type: 'array',
    itemType: 'string',
    required: true,
  })
  tags: string[];

  @property({
    type: 'string',
  })
  project?: string;

  @property({
    type: 'array',
    itemType: 'string',
  })
  chainids: string[];

  @property({
    type: 'date',
    generated: true,
    default: new Date(),
  })
  timestamp: Date;

  constructor(data?: Partial<PipeContainer>) {
    super(data);
  }
}