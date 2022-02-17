import { Annotations } from '@aws-cdk/core';
import { CfnInstance, CfnLaunchTemplate } from '../ec2.generated';
import { BlockDevice, EbsDeviceVolumeType } from '../volume';

// keep this import separate from other imports to reduce chance for merge conflicts with v2-main
// eslint-disable-next-line no-duplicate-imports, import/order
import { Construct } from 'constructs';

export function instanceBlockDeviceMappings(construct: Construct, blockDevices: BlockDevice[]): CfnInstance.BlockDeviceMappingProperty[] {
  return synthesizeBlockDeviceMappings<CfnInstance.BlockDeviceMappingProperty, object>(construct, blockDevices, {});
}

export function launchTemplateBlockDeviceMappings(construct: Construct, blockDevices: BlockDevice[]): CfnLaunchTemplate.BlockDeviceMappingProperty[] {
  return synthesizeBlockDeviceMappings<CfnLaunchTemplate.BlockDeviceMappingProperty, string>(construct, blockDevices, '');
}

/**
 * Synthesize an array of block device mappings from a list of block device
 *
 * @param construct the instance/asg construct, used to host any warning
 * @param blockDevices list of block devices
 */
function synthesizeBlockDeviceMappings<RT, NDT>(construct: Construct, blockDevices: BlockDevice[], noDeviceValue: NDT): RT[] {
  return blockDevices.map<RT>(({ deviceName, volume, mappingEnabled }): RT => {
    const { virtualName, ebsDevice: ebs } = volume;

    let finalEbs: CfnLaunchTemplate.EbsProperty | CfnInstance.EbsProperty | undefined;

    if (ebs) {

      const { iops, volumeType, kmsKey, ...rest } = ebs;

      if (!iops) {
        if (volumeType === EbsDeviceVolumeType.IO1) {
          throw new Error('iops property is required with volumeType: EbsDeviceVolumeType.IO1');
        }
      } else if (volumeType !== EbsDeviceVolumeType.IO1) {
        Annotations.of(construct).addWarning('iops will be ignored without volumeType: EbsDeviceVolumeType.IO1');
      }

      /**
       * Because the Ebs properties of the L2 Constructs do not match the Ebs properties of the Cfn Constructs,
       * we have to do some transformation and handle all destructed properties
       */

      finalEbs = {
        ...rest,
        iops,
        volumeType,
        kmsKeyId: kmsKey?.keyArn,
      };

    } else {
      finalEbs = undefined;
    }


    const noDevice = mappingEnabled === false ? noDeviceValue : undefined;
    return { deviceName, ebs: finalEbs, virtualName, noDevice } as any;
  });
}
