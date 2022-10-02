/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */
import type {
  BaseContract,
  BigNumber,
  BytesLike,
  CallOverrides,
  PopulatedTransaction,
  Signer,
  utils,
} from "ethers";
import type { FunctionFragment, Result } from "@ethersproject/abi";
import type { Listener, Provider } from "@ethersproject/providers";
import type {
  TypedEventFilter,
  TypedEvent,
  TypedListener,
  OnEvent,
  PromiseOrValue,
} from "./common";

export interface FileStoreFrontendInterface extends utils.Interface {
  functions: {
    "getContent(address,bytes32)": FunctionFragment;
    "readFile(address,string)": FunctionFragment;
  };

  getFunction(
    nameOrSignatureOrTopic: "getContent" | "readFile"
  ): FunctionFragment;

  encodeFunctionData(
    functionFragment: "getContent",
    values: [PromiseOrValue<string>, PromiseOrValue<BytesLike>]
  ): string;
  encodeFunctionData(
    functionFragment: "readFile",
    values: [PromiseOrValue<string>, PromiseOrValue<string>]
  ): string;

  decodeFunctionResult(functionFragment: "getContent", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "readFile", data: BytesLike): Result;

  events: {};
}

export interface FileStoreFrontend extends BaseContract {
  connect(signerOrProvider: Signer | Provider | string): this;
  attach(addressOrName: string): this;
  deployed(): Promise<this>;

  interface: FileStoreFrontendInterface;

  queryFilter<TEvent extends TypedEvent>(
    event: TypedEventFilter<TEvent>,
    fromBlockOrBlockhash?: string | number | undefined,
    toBlock?: string | number | undefined
  ): Promise<Array<TEvent>>;

  listeners<TEvent extends TypedEvent>(
    eventFilter?: TypedEventFilter<TEvent>
  ): Array<TypedListener<TEvent>>;
  listeners(eventName?: string): Array<Listener>;
  removeAllListeners<TEvent extends TypedEvent>(
    eventFilter: TypedEventFilter<TEvent>
  ): this;
  removeAllListeners(eventName?: string): this;
  off: OnEvent<this>;
  on: OnEvent<this>;
  once: OnEvent<this>;
  removeListener: OnEvent<this>;

  functions: {
    getContent(
      contentStore: PromiseOrValue<string>,
      checksum: PromiseOrValue<BytesLike>,
      overrides?: CallOverrides
    ): Promise<[string] & { content: string }>;

    readFile(
      fileStore: PromiseOrValue<string>,
      filename: PromiseOrValue<string>,
      overrides?: CallOverrides
    ): Promise<[string] & { contents: string }>;
  };

  getContent(
    contentStore: PromiseOrValue<string>,
    checksum: PromiseOrValue<BytesLike>,
    overrides?: CallOverrides
  ): Promise<string>;

  readFile(
    fileStore: PromiseOrValue<string>,
    filename: PromiseOrValue<string>,
    overrides?: CallOverrides
  ): Promise<string>;

  callStatic: {
    getContent(
      contentStore: PromiseOrValue<string>,
      checksum: PromiseOrValue<BytesLike>,
      overrides?: CallOverrides
    ): Promise<string>;

    readFile(
      fileStore: PromiseOrValue<string>,
      filename: PromiseOrValue<string>,
      overrides?: CallOverrides
    ): Promise<string>;
  };

  filters: {};

  estimateGas: {
    getContent(
      contentStore: PromiseOrValue<string>,
      checksum: PromiseOrValue<BytesLike>,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    readFile(
      fileStore: PromiseOrValue<string>,
      filename: PromiseOrValue<string>,
      overrides?: CallOverrides
    ): Promise<BigNumber>;
  };

  populateTransaction: {
    getContent(
      contentStore: PromiseOrValue<string>,
      checksum: PromiseOrValue<BytesLike>,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    readFile(
      fileStore: PromiseOrValue<string>,
      filename: PromiseOrValue<string>,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;
  };
}
