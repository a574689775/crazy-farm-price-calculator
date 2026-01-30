import { useMemo } from 'react'
import type { CropConfig, WeatherMutation } from '@/types'
import {
  QUALITY_MUTATIONS,
  MOON_COMMON_MUTATIONS,
  COMMON_MUTATIONS,
  RARE_MUTATIONS,
  PAST_MUTATIONS,
  INTERMEDIATE_MUTATIONS,
  COMBINATION_RULES,
} from './constants'
import { applyCombinations, isMutationDisabled, getAllIngredients } from './utils'
import { MutationGroup } from './MutationGroup'
import './PriceCalculator.css'

interface MutationGroupsProps {
  crop: CropConfig
  selectedMutations: WeatherMutation[]
  onMutationsChange: (mutations: WeatherMutation[]) => void
}

/**
 * 所有突变组的容器组件
 */
export const MutationGroups = ({
  crop,
  selectedMutations,
  onMutationsChange,
}: MutationGroupsProps) => {
  /**
   * 获取组的选择状态
   */
  const getGroupState = (mutations: WeatherMutation[]): 'none' | 'all' | 'indeterminate' => {
    const selectedCount = mutations.filter(m => selectedMutations.includes(m)).length
    if (selectedCount === 0) return 'none'
    if (selectedCount === mutations.length) return 'all'
    return 'indeterminate'
  }

  /**
   * 处理组 checkbox 点击（全选或清空）
   */
  const handleGroupToggle = (mutations: WeatherMutation[], isExclusive: boolean = false) => {
    const state = getGroupState(mutations)
    
    if (state === 'all') {
      // 全选状态，点击后清空
      onMutationsChange(selectedMutations.filter(m => !mutations.includes(m)))
    } else {
      // 部分选中或全不选，点击后全选
      if (isExclusive) {
        // 品质突变互斥，只选第一个
        const otherQualities = QUALITY_MUTATIONS.filter(m => m !== mutations[0])
        const filtered = selectedMutations.filter(m => !otherQualities.includes(m))
        onMutationsChange([...filtered, mutations[0]])
      } else {
        // 普通突变，全选（只考虑合成规则）
        let newMutations = [...selectedMutations]
        mutations.forEach(mutationName => {
          // 跳过被禁用的突变
          if (!newMutations.includes(mutationName) && !isMutationDisabled(mutationName, selectedMutations)) {
            newMutations.push(mutationName)
          }
        })
        // 应用合成规则
        onMutationsChange(applyCombinations(newMutations))
      }
    }
  }

  /**
   * 处理普通突变选择
   */
  const toggleMutation = (mutationName: WeatherMutation) => {
    if (isMutationDisabled(mutationName, selectedMutations)) {
      return
    }

    if (selectedMutations.includes(mutationName)) {
      // 取消选择
      onMutationsChange(selectedMutations.filter(m => m !== mutationName))
    } else {
      // 选择新的突变
      let newMutations = [...selectedMutations]
      
      // 检查这个突变是否是某个合成规则的结果
      // 如果是，需要移除它的所有原料（包括直接和间接的），但排除"潮湿"
      for (const rule of COMBINATION_RULES) {
        if (rule.result === mutationName) {
          // 获取所有原料（包括间接的，如"瓷化"需要"陶化"和"灼热"，"陶化"又需要"沙尘"和"潮湿"）
          const allIngredients = getAllIngredients(mutationName)
          // 移除所有原料（包括间接的），但排除"潮湿"（因为潮湿比较特殊）
          newMutations = newMutations.filter(m => !allIngredients.includes(m) || m === '潮湿')
        }
      }
      
      // 添加新选择的突变
      newMutations.push(mutationName)
      
      // 应用合成规则（处理其他可能的合成，如"沙尘"+"潮湿"→"陶化"）
      onMutationsChange(applyCombinations(newMutations))
    }
  }

  /**
   * 处理互斥突变（品质突变和异形突变，只能选一个）
   */
  const toggleExclusiveMutation = (mutationName: WeatherMutation, exclusiveGroup: WeatherMutation[]) => {
    if (selectedMutations.includes(mutationName)) {
      // 取消选择
      onMutationsChange(selectedMutations.filter(m => m !== mutationName))
    } else {
      // 选择新的，先移除同组其他突变
      const otherMutations = exclusiveGroup.filter(m => m !== mutationName)
      const filtered = selectedMutations.filter(m => !otherMutations.includes(m))
      onMutationsChange([...filtered, mutationName])
    }
  }

  // 中间状态突变（月球作物时包含太阳耀斑，太阳耀斑+灼热=流火）
  const intermediateMutations: WeatherMutation[] = useMemo(
    () => crop.type === '月球' ? ['太阳耀斑' as WeatherMutation, ...INTERMEDIATE_MUTATIONS] : INTERMEDIATE_MUTATIONS,
    [crop.type]
  )

  // 根据作物类型过滤品质突变（星空只有月球作物才有）
  const qualityMutations = crop.type === '月球' 
    ? QUALITY_MUTATIONS 
    : QUALITY_MUTATIONS.filter(m => m !== '星空')

  return (
    <>
      {/* 品质突变（互斥，不显示checkbox） */}
      <MutationGroup
        title="品质"
        mutations={qualityMutations}
        selectedMutations={selectedMutations}
        isExclusive={true}
        showCheckbox={false}
        groupState={getGroupState(qualityMutations)}
        onToggleGroup={() => handleGroupToggle(qualityMutations, true)}
        onToggleMutation={toggleMutation}
        onToggleExclusiveMutation={(name) => toggleExclusiveMutation(name, qualityMutations)}
      />
      
      {/* 异形突变（根据作物显示，不互斥） */}
      {crop.specialMutations && crop.specialMutations.length > 0 && (
        <MutationGroup
          title="异形突变"
          mutations={crop.specialMutations}
          selectedMutations={selectedMutations}
          isExclusive={false}
          showCheckbox={false}
          groupState={getGroupState(crop.specialMutations)}
          onToggleGroup={() => handleGroupToggle(crop.specialMutations!, false)}
          onToggleMutation={toggleMutation}
          onToggleExclusiveMutation={(name) => toggleExclusiveMutation(name, crop.specialMutations!)}
        />
      )}
      
      {/* 月球突变（只有月球作物才有，显示在常见突变上面） */}
      {crop.type === '月球' && (
        <MutationGroup
          title="月球突变"
          mutations={MOON_COMMON_MUTATIONS}
          selectedMutations={selectedMutations}
          isExclusive={false}
          showCheckbox={true}
          groupState={getGroupState(MOON_COMMON_MUTATIONS)}
          onToggleGroup={() => handleGroupToggle(MOON_COMMON_MUTATIONS, false)}
          onToggleMutation={toggleMutation}
          onToggleExclusiveMutation={(name) => toggleExclusiveMutation(name, MOON_COMMON_MUTATIONS)}
        />
      )}
      
      {/* 常见突变 */}
      <MutationGroup
        title="常见突变"
        mutations={COMMON_MUTATIONS}
        selectedMutations={selectedMutations}
        isExclusive={false}
        showCheckbox={true}
        groupState={getGroupState(COMMON_MUTATIONS)}
        onToggleGroup={() => handleGroupToggle(COMMON_MUTATIONS, false)}
        onToggleMutation={toggleMutation}
        onToggleExclusiveMutation={(name) => toggleExclusiveMutation(name, COMMON_MUTATIONS)}
      />
      
      {/* 中间状态突变（不显示checkbox；月球作物时包含太阳耀斑，太阳耀斑+灼热=流火） */}
      <MutationGroup
        title="中间状态突变"
        mutations={intermediateMutations}
        selectedMutations={selectedMutations}
        isExclusive={false}
        showCheckbox={false}
        groupState={getGroupState(intermediateMutations)}
        onToggleGroup={() => handleGroupToggle(intermediateMutations, false)}
        onToggleMutation={toggleMutation}
        onToggleExclusiveMutation={(name) => toggleExclusiveMutation(name, intermediateMutations)}
      />
      
      {/* 罕见突变 */}
      <MutationGroup
        title="罕见突变"
        mutations={RARE_MUTATIONS}
        selectedMutations={selectedMutations}
        isExclusive={false}
        showCheckbox={true}
        groupState={getGroupState(RARE_MUTATIONS)}
        onToggleGroup={() => handleGroupToggle(RARE_MUTATIONS, false)}
        onToggleMutation={toggleMutation}
        onToggleExclusiveMutation={(name) => toggleExclusiveMutation(name, RARE_MUTATIONS)}
      />
      
      {/* 往期突变 */}
      <MutationGroup
        title="往期突变"
        mutations={PAST_MUTATIONS}
        selectedMutations={selectedMutations}
        isExclusive={false}
        showCheckbox={true}
        groupState={getGroupState(PAST_MUTATIONS)}
        onToggleGroup={() => handleGroupToggle(PAST_MUTATIONS, false)}
        onToggleMutation={toggleMutation}
        onToggleExclusiveMutation={(name) => toggleExclusiveMutation(name, PAST_MUTATIONS)}
      />
    </>
  )
}
