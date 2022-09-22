/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */
import type { BaseContract, BigNumber, BytesLike, Signer, utils } from "ethers";
import type { EventFragment } from "@ethersproject/abi";
import type { Listener, Provider } from "@ethersproject/providers";
import type {
  TypedEventFilter,
  TypedEvent,
  TypedListener,
  OnEvent,
  PromiseOrValue,
} from "./common";

export interface FileWriterInterface extends utils.Interface {
  functions: {};

  events: {
    "NewFile(bytes32,uint256,bytes)": EventFragment;
  };

  getEvent(nameOrSignatureOrTopic: "NewFile"): EventFragment;
}

export interface NewFileEventObject {
  checksum: string;
  size: BigNumber;
  metadata: string;
}
export type NewFileEvent = TypedEvent<
  [string, BigNumber, string],
  NewFileEventObject
>;

export type NewFileEventFilter = TypedEventFilter<NewFileEvent>;

export interface FileWriter extends BaseContract {
  connect(signerOrProvider: Signer | Provider | string): this;
  attach(addressOrName: string): this;
  deployed(): Promise<this>;

  interface: FileWriterInterface;

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

  functions: {};

  callStatic: {};

  filters: {
    "NewFile(bytes32,uint256,bytes)"(
      checksum?: PromiseOrValue<BytesLike> | null,
      size?: null,
      metadata?: null
    ): NewFileEventFilter;
    NewFile(
      checksum?: PromiseOrValue<BytesLike> | null,
      size?: null,
      metadata?: null
    ): NewFileEventFilter;
  };

  estimateGas: {};

  populateTransaction: {};
}
