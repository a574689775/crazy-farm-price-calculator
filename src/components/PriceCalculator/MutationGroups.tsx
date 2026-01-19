import type { CropConfig, WeatherMutation } from '@/types'
import {
  QUALITY_MUTATIONS,
  COMMON_MUTATIONS,
  RARE_MUTATIONS,
  PAST_MUTATIONS,
  INTERMEDIATE_MUTATIONS,
} from './constants'
import { applyCombinations, isMutationDisabled } from './utils'
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
      // 选择新的突变，直接添加后应用合成规则
      const newMutations = [...selectedMutations, mutationName]
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

  return (
    <>
      {/* 品质突变（互斥，不显示checkbox） */}
      <MutationGroup
        title="品质"
        mutations={QUALITY_MUTATIONS}
        selectedMutations={selectedMutations}
        isExclusive={true}
        showCheckbox={false}
        groupState={getGroupState(QUALITY_MUTATIONS)}
        onToggleGroup={() => handleGroupToggle(QUALITY_MUTATIONS, true)}
        onToggleMutation={toggleMutation}
        onToggleExclusiveMutation={(name) => toggleExclusiveMutation(name, QUALITY_MUTATIONS)}
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
      
      {/* 中间状态突变（不显示checkbox） */}
      <MutationGroup
        title="中间状态突变"
        mutations={INTERMEDIATE_MUTATIONS}
        selectedMutations={selectedMutations}
        isExclusive={false}
        showCheckbox={false}
        groupState={getGroupState(INTERMEDIATE_MUTATIONS)}
        onToggleGroup={() => handleGroupToggle(INTERMEDIATE_MUTATIONS, false)}
        onToggleMutation={toggleMutation}
        onToggleExclusiveMutation={(name) => toggleExclusiveMutation(name, INTERMEDIATE_MUTATIONS)}
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
