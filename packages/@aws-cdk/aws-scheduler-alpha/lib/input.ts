import { DefaultTokenResolver, IResolveContext, Stack, StringConcat, Token, Tokenization } from 'aws-cdk-lib';
import { ISchedule } from './schedule';

/**
 * The text, or well-formed JSON, passed to the target of the schedule.
 */
export abstract class ScheduleTargetInput {
  /**
   * Pass text to the target, it is possible to embed `ContextAttributes`
   * that will be resolved to actual values while the CloudFormation is
   * deployed or cdk Tokens that will be resolved when the CloudFormation
   * templates are generated by CDK.
   *
   * The target input value will be a single string that you pass.
   * For passing complex values like JSON object to a target use method
   * `ScheduleTargetInput.fromObject()` instead.
   *
   * @param text Text to use as the input for the target
   */
  public static fromText(text: string): ScheduleTargetInput {
    return new FieldAwareEventInput(text, false);
  }

  /**
   * Pass a JSON object to the target, it is possible to embed `ContextAttributes` and other
   * cdk references.
   *
   * @param obj object to use to convert to JSON to use as input for the target
   */
  public static fromObject(obj: any): ScheduleTargetInput {
    return new FieldAwareEventInput(obj, true);
  }

  protected constructor() {
  }

  /**
   * Return the input properties for this input object
   */
  public abstract bind(schedule: ISchedule): string;
}

class FieldAwareEventInput extends ScheduleTargetInput {
  constructor(private readonly input: any, private readonly toJsonString: boolean) {
    super();
  }

  public bind(schedule: ISchedule): string {
    class Replacer extends DefaultTokenResolver {
      constructor() {
        super(new StringConcat());
      }

      public resolveToken(t: Token, _context: IResolveContext) {
        return Token.asString(t);
      }
    }

    const stack = Stack.of(schedule);
    const inputString = Tokenization.resolve(this.input, {
      scope: schedule,
      resolver: new Replacer(),
    });
    return this.toJsonString ? stack.toJsonString(inputString) : inputString;
  }
}

/**
 * Represents a field in the event pattern
 *
 * @see https://docs.aws.amazon.com/scheduler/latest/UserGuide/managing-schedule-context-attributes.html
 */
export class ContextAttribute {
  /**
   * The ARN of the schedule.
   */
  public static get scheduleArn(): string {
    return this.fromName('schedule-arn');
  }

  /**
   * The time you specified for the schedule to invoke its target, for example,
   * 2022-03-22T18:59:43Z.
   */
  public static get scheduledTime(): string {
    return this.fromName('scheduled-time');
  }

  /**
   * The unique ID that EventBridge Scheduler assigns for each attempted invocation of
   * a target, for example, d32c5kddcf5bb8c3.
   */
  public static get executionId(): string {
    return this.fromName('execution-id');
  }

  /**
   * A counter that identifies the attempt number for the current invocation, for
   * example, 1.
   */
  public static get attemptNumber(): string {
    return this.fromName('attempt-number');
  }

  /**
   * Escape hatch for other ContextAttribute that might be resolved in future.
   *
   * @param name - name will replace xxx in <aws.scheduler.xxx>
   */
  public static fromName(name: string): string {
    return new ContextAttribute(name).toString();
  }

  private constructor(public readonly name: string) {
  }

  /**
   * Convert the path to the field in the event pattern to JSON
   */
  public toString() {
    return `<aws.scheduler.${this.name}>`;
  }
}
