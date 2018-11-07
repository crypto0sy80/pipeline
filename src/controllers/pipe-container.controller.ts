import {
  Count,
  CountSchema,
  Filter,
  repository,
  Where,
} from '@loopback/repository';
import {
  post,
  param,
  get,
  getFilterSchemaFor,
  getWhereSchemaFor,
  patch,
  del,
  requestBody,
} from '@loopback/rest';
import {PipeContainer, SmartContractContainer, PipeFunction} from '../models';
import {PipeContainerRepository} from '../repositories';
import {PipeFunctionController} from './pipe-function.controller';
import {AbiFunctionInput, AbiFunctionOuput, AbiFunction} from '../interfaces/abi';
import {
    Devdoc,
    Userdoc,
} from '../interfaces/soldocs';

export class PipeContainerController {
  constructor(
    @repository(PipeContainerRepository)
    public pipeContainerRepository : PipeContainerRepository,
  ) {}

  @post('/pipecontainer', {
    responses: {
      '200': {
        description: 'PipeContainer model instance',
        content: {'application/json': {'x-ts-type': PipeContainer}},
      },
    },
  })
  async create(@requestBody() pipeContainer: PipeContainer): Promise<PipeContainer> {
    return await this.pipeContainerRepository.create(pipeContainer);
  }

  @get('/pipecontainer/count', {
    responses: {
      '200': {
        description: 'PipeContainer model count',
        content: {'application/json': {schema: CountSchema}},
      },
    },
  })
  async count(
    @param.query.object('where', getWhereSchemaFor(PipeContainer)) where?: Where,
  ): Promise<Count> {
    return await this.pipeContainerRepository.count(where);
  }

  @get('/pipecontainer', {
    responses: {
      '200': {
        description: 'Array of PipeContainer model instances',
        content: {
          'application/json': {
            schema: {type: 'array', items: {'x-ts-type': PipeContainer}},
          },
        },
      },
    },
  })
  async find(
    @param.query.object('filter', getFilterSchemaFor(PipeContainer)) filter?: Filter,
  ): Promise<PipeContainer[]> {
    return await this.pipeContainerRepository.find(filter);
  }

  @patch('/pipecontainer', {
    responses: {
      '200': {
        description: 'PipeContainer PATCH success count',
        content: {'application/json': {schema: CountSchema}},
      },
    },
  })
  async updateAll(
    @requestBody() pipeContainer: PipeContainer,
    @param.query.object('where', getWhereSchemaFor(PipeContainer)) where?: Where,
  ): Promise<Count> {
    return await this.pipeContainerRepository.updateAll(pipeContainer, where);
  }

  @get('/pipecontainer/{id}', {
    responses: {
      '200': {
        description: 'PipeContainer model instance',
        content: {'application/json': {'x-ts-type': PipeContainer}},
      },
    },
  })
  async findById(@param.path.string('id') id: string): Promise<PipeContainer> {
    return await this.pipeContainerRepository.findById(id);
  }

  @get('/pipecontainer/{id}/js', {
    responses: {
      '200': {
        description: 'PipeContainer JS script',
        content: {'application/javascript': {'x-ts-type': PipeContainer}},
      },
    },
  })
  async getJSById(@param.path.string('id') id: string): Promise<string> {
    const pipecontainer = await this.pipeContainerRepository.findById(id);
    return (<SmartContractContainer>pipecontainer.container).jssource || '';
  }

  @patch('/pipecontainer/{id}', {
    responses: {
      '204': {
        description: 'PipeContainer PATCH success',
      },
    },
  })
  async updateById(
    @param.path.string('id') id: string,
    @requestBody() pipeContainer: PipeContainer,
  ): Promise<void> {
    await this.pipeContainerRepository.updateById(id, pipeContainer);
  }

  @del('/pipecontainer/{id}', {
    responses: {
      '204': {
        description: 'PipeContainer DELETE success',
      },
    },
  })
  async deleteById(@param.path.string('id') id: string): Promise<void> {
    await this.pipeContainerRepository.deleteById(id);
  }

  // Additional routes
  @post('/pipecontainer/pipefunctions')
  async createFunctions(
    @requestBody() pipeContainer: PipeContainer,
  ): Promise<PipeContainer | void> {
    let newContainer = await this.create(pipeContainer);
    this.createFunctionsFromContainer(newContainer).catch((e: Error) => {
        console.log('createFunctionsFromContainer', e);
        this.deleteContainerFunctions(newContainer._id);
        return this.deleteById(newContainer._id);
    });
    return newContainer;
  }

  @post('/pipecontainer/{id}/pipefunctions')
  async createFunctionsFromContainer(
    @requestBody() pipeContainer: PipeContainer,
): Promise<PipeContainer | void> {
    let abi: AbiFunction[], devdoc: Devdoc, userdoc: Userdoc;
    let emptydoc = {methods: {}};

    abi = pipeContainer.container.abi || [];
    devdoc = pipeContainer.container.devdoc || emptydoc;
    userdoc = pipeContainer.container.userdoc || emptydoc;

    for (let i=0; i < abi.length; i++) {
        let funcabi: AbiFunction = abi[i];
        let signature, functiondoc;

        signature = funcabi.inputs.map((input: AbiFunctionInput) => input.type).join(',');
        signature = funcabi.name ? `${funcabi.name}(${signature})` : undefined;
        functiondoc = {
            signature,
            abiObj: funcabi,
            devdoc: signature ? devdoc.methods[signature] : undefined,
            userdoc: signature ? userdoc.methods[signature] : undefined,
            uri: pipeContainer.uri,
            tags: pipeContainer.tags,
            timestamp: pipeContainer.timestamp,
            chainid: (<SmartContractContainer>pipeContainer.container).chainid,
        }
        let pipefunction = await this.pipeContainerRepository.functions(pipeContainer._id).create(functiondoc);

        if (!this.pipeContainerRepository.functions(pipeContainer._id).find({where: {_id: pipefunction._id}})) {
            throw new Error(`Function ${functiondoc.abiObj}was not created.`)
        };
    };
    return;
  }

  @del('/pipecontainer/{id}/pipefunctions', {
    responses: {
      '200': {
        description: 'PipeContainer.PipeFunction DELETE success count',
        content: {'application/json': {schema: CountSchema}},
      },
    },
  })
  async deleteContainerFunctions(
    @param.path.string('id') id: string,
    // @param.query.object('where', getWhereSchemaFor(PipeFunction)) where?: Where,
  ): Promise<Count> {
    let pipefunctionRepository = await this.pipeContainerRepository.pipefunctions;
    let pipeFunctionController = new PipeFunctionController(pipefunctionRepository);
    await this.pipeContainerRepository.deleteById(id);
    return await pipeFunctionController.delete({containerid: {like: id}});
    // return await this.pipeContainerRepository.functions(id).delete();
  }

  // @get('/pipecontainer/{id}/compile', {
  //   responses: {
  //     '200': {
  //       description: 'PipeContainer model instance',
  //       content: {'application/json': {'x-ts-type': PipeContainer}},
  //     },
  //   },
  // })
  // async compileSolidityContainer(@param.path.string('id') id: string): Promise<PipeContainer> {
  //   let compiled: any;
  //   let metadata: any;
  //   let updateData: any = {container: {}};
  //   const pipeContainer =  await this.pipeContainerRepository.findById(id);
  //
  //   // Do not compile and update the container if we already have the abi & docs
  //   if (
  //       pipeContainer.container &&
  //       pipeContainer.container.abi &&
  //       pipeContainer.container.devdoc &&
  //       pipeContainer.container.userdoc
  //   ) {
  //       return pipeContainer;
  //   }
  //
  //   if (!pipeContainer.container.solsource) {
  //       throw new Error('No Solidity source was found and no ABI, devdoc, userdoc.');
  //   }
  //
  //   compiled = this.compile(pipeContainer.container.solsource);
  //
  //   console.log('compiled', compiled);
  //
  //   if (!compiled.contracts[`:${pipeContainer.name}`]) {
  //       throw new Error('Contract name is incorrect, retrieving info from compiled data failed.');
  //   }
  //
  //   compiled = compiled.contracts[`:${pipeContainer.name}`];
  //   metadata = JSON.parse(compiled.metadata);
  //
  //   updateData.container.devdoc = metadata.output.devdoc;
  //   updateData.container.userdoc = metadata.output.userdoc;
  //
  //   if (!pipeContainer.container.abi) {
  //       updateData.container.abi = JSON.parse(compiled.interface);
  //       updateData.container.bytecode = compiled.bytecode;
  //   }
  //
  //   await this.pipeContainerRepository.updateById(pipeContainer._id, updateData);
  //   const updatedContainer = await this.pipeContainerRepository.findById(pipeContainer._id, updateData);
  //
  //   if (updateData.container.abi) {
  //       console.log('createFunctionsFromContainer');
  //       this.createFunctionsFromContainer(updatedContainer).catch(e => {
  //           console.log('createFunctionsFromContainer', e);
  //           this.pipeContainerRepository.deleteById(updatedContainer._id);
  //       });
  //   }
  //   return updatedContainer;
  // }
  //
  // compile(source: string): any {
  //   const compiled = solc.compile(source, 0);
  //   console.log('compiled', compiled);
  //   if (!compiled) {
  //       throw new Error('Compilation failed.');
  //   }
  //   return compiled;
  // }
}