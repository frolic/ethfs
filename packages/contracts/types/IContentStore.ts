/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */
import type {
  BaseContract,
  BigNumber,
  BigNumberish,
  BytesLike,
  CallOverrides,
  ContractTransaction,
  Overrides,
  PopulatedTransaction,
  Signer,
  utils,
} from "ethers";
import type {
  FunctionFragment,
  Result,
  EventFragment,
} from "@ethersproject/abi";
import type { Listener, Provider } from "@ethersproject/providers";
import type {
  TypedEventFilter,
  TypedEvent,
  TypedListener,
  OnEvent,
  PromiseOrValue,
} from "./common";

export interface IContentStoreInterface extends utils.Interface {
  functions: {
    "addContent(bytes)": FunctionFragment;
    "addPointer(address)": FunctionFragment;
    "checksumExists(bytes32)": FunctionFragment;
    "checksums(uint256)": FunctionFragment;
    "contentLength(bytes32)": FunctionFragment;
    "getPointer(bytes32)": FunctionFragment;
    "pointers(bytes32)": FunctionFragment;
  };

  getFunction(
    nameOrSignatureOrTopic:
      | "addContent"
      | "addPointer"
      | "checksumExists"
      | "checksums"
      | "contentLength"
      | "getPointer"
      | "pointers"
  ): FunctionFragment;

  encodeFunctionData(
    functionFragment: "addContent",
    values: [PromiseOrValue<BytesLike>]
  ): string;
  encodeFunctionData(
    functionFragment: "addPointer",
    values: [PromiseOrValue<string>]
  ): string;
  encodeFunctionData(
    functionFragment: "checksumExists",
    values: [PromiseOrValue<BytesLike>]
  ): string;
  encodeFunctionData(
    functionFragment: "checksums",
    values: [PromiseOrValue<BigNumberish>]
  ): string;
  encodeFunctionData(
    functionFragment: "contentLength",
    values: [PromiseOrValue<BytesLike>]
  ): string;
  encodeFunctionData(
    functionFragment: "getPointer",
    values: [PromiseOrValue<BytesLike>]
  ): string;
  encodeFunctionData(
    functionFragment: "pointers",
    values: [PromiseOrValue<BytesLike>]
  ): string;

  decodeFunctionResult(functionFragment: "addContent", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "addPointer", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "checksumExists",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "checksums", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "contentLength",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "getPointer", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "pointers", data: BytesLike): Result;

  events: {
    "NewChecksum(bytes32,uint256)": EventFragment;
  };

  getEvent(nameOrSignatureOrTopic: "NewChecksum"): EventFragment;
}

export interface NewChecksumEventObject {
  checksum: string;
  contentSize: BigNumber;
}
export type NewChecksumEvent = TypedEvent<
  [string, BigNumber],
  NewChecksumEventObject
>;

export type NewChecksumEventFilter = TypedEventFilter<NewChecksumEvent>;

export interface IContentStore extends BaseContract {
  connect(signerOrProvider: Signer | Provider | string): this;
  attach(addressOrName: string): this;
  deployed(): Promise<this>;

  interface: IContentStoreInterface;

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
    addContent(
      content: PromiseOrValue<BytesLike>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<ContractTransaction>;

    addPointer(
      pointer: PromiseOrValue<string>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<ContractTransaction>;

    checksumExists(
      checksum: PromiseOrValue<BytesLike>,
      overrides?: CallOverrides
    ): Promise<[boolean]>;

    checksums(
      index: PromiseOrValue<BigNumberish>,
      overrides?: CallOverrides
    ): Promise<[string] & { checksum: string }>;

    contentLength(
      checksum: PromiseOrValue<BytesLike>,
      overrides?: CallOverrides
    ): Promise<[BigNumber] & { size: BigNumber }>;

    getPointer(
      checksum: PromiseOrValue<BytesLike>,
      overrides?: CallOverrides
    ): Promise<[string] & { pointer: string }>;

    pointers(
      checksum: PromiseOrValue<BytesLike>,
      overrides?: CallOverrides
    ): Promise<[string] & { pointer: string }>;
  };

  addContent(
    content: PromiseOrValue<BytesLike>,
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<ContractTransaction>;

  addPointer(
    pointer: PromiseOrValue<string>,
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<ContractTransaction>;

  checksumExists(
    checksum: PromiseOrValue<BytesLike>,
    overrides?: CallOverrides
  ): Promise<boolean>;

  checksums(
    index: PromiseOrValue<BigNumberish>,
    overrides?: CallOverrides
  ): Promise<string>;

  contentLength(
    checksum: PromiseOrValue<BytesLike>,
    overrides?: CallOverrides
  ): Promise<BigNumber>;

  getPointer(
    checksum: PromiseOrValue<BytesLike>,
    overrides?: CallOverrides
  ): Promise<string>;

  pointers(
    checksum: PromiseOrValue<BytesLike>,
    overrides?: CallOverrides
  ): Promise<string>;

  callStatic: {
    addContent(
      content: PromiseOrValue<BytesLike>,
      overrides?: CallOverrides
    ): Promise<[string, string] & { checksum: string; pointer: string }>;

    addPointer(
      pointer: PromiseOrValue<string>,
      overrides?: CallOverrides
    ): Promise<string>;

    checksumExists(
      checksum: PromiseOrValue<BytesLike>,
      overrides?: CallOverrides
    ): Promise<boolean>;

    checksums(
      index: PromiseOrValue<BigNumberish>,
      overrides?: CallOverrides
    ): Promise<string>;

    contentLength(
      checksum: PromiseOrValue<BytesLike>,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    getPointer(
      checksum: PromiseOrValue<BytesLike>,
      overrides?: CallOverrides
    ): Promise<string>;

    pointers(
      checksum: PromiseOrValue<BytesLike>,
      overrides?: CallOverrides
    ): Promise<string>;
  };

  filters: {
    "NewChecksum(bytes32,uint256)"(
      checksum?: PromiseOrValue<BytesLike> | null,
      contentSize?: null
    ): NewChecksumEventFilter;
    NewChecksum(
      checksum?: PromiseOrValue<BytesLike> | null,
      contentSize?: null
    ): NewChecksumEventFilter;
  };

  estimateGas: {
    addContent(
      content: PromiseOrValue<BytesLike>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<BigNumber>;

    addPointer(
      pointer: PromiseOrValue<string>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<BigNumber>;

    checksumExists(
      checksum: PromiseOrValue<BytesLike>,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    checksums(
      index: PromiseOrValue<BigNumberish>,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    contentLength(
      checksum: PromiseOrValue<BytesLike>,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    getPointer(
      checksum: PromiseOrValue<BytesLike>,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    pointers(
      checksum: PromiseOrValue<BytesLike>,
      overrides?: CallOverrides
    ): Promise<BigNumber>;
  };

  populateTransaction: {
    addContent(
      content: PromiseOrValue<BytesLike>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<PopulatedTransaction>;

    addPointer(
      pointer: PromiseOrValue<string>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<PopulatedTransaction>;

    checksumExists(
      checksum: PromiseOrValue<BytesLike>,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    checksums(
      index: PromiseOrValue<BigNumberish>,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    contentLength(
      checksum: PromiseOrValue<BytesLike>,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    getPointer(
      checksum: PromiseOrValue<BytesLike>,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    pointers(
      checksum: PromiseOrValue<BytesLike>,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;
  };
}
