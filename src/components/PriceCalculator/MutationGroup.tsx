import type { WeatherMutation } from '@/types'
import { weatherMutations, mutationColorConfig } from '@/data/weatherMutations'
import { SVGText } from '@/components/SVGText'
import { isMutationDisabled } from './utils'
import './PriceCalculator.css'

interface MutationGroupProps {
  title: string
  mutations: WeatherMutation[]
  selectedMutations: WeatherMutation[]
  isExclusive?: boolean
  showCheckbox?: boolean
  groupState: 'none' | 'all' | 'indeterminate'
  onToggleGroup: () => void
  onToggleMutation: (mutationName: WeatherMutation) => void
  onToggleExclusiveMutation: (mutationName: WeatherMutation) => void
}

/**
 * 单个突变组组件
 */
export const MutationGroup = ({
  title,
  mutations,
  selectedMutations,
  isExclusive = false,
  showCheckbox = true,
  groupState,
  onToggleGroup,
  onToggleMutation,
  onToggleExclusiveMutation,
}: MutationGroupProps) => {
  return (
    <div className="mutation-group">
      <div className="mutation-group-header">
        {showCheckbox ? (
          <label className="mutation-group-checkbox-label">
            <input
              type="checkbox"
              className="mutation-group-checkbox"
              checked={groupState === 'all'}
              ref={(el) => {
                if (el) {
                  el.indeterminate = groupState === 'indeterminate'
                }
              }}
              onChange={onToggleGroup}
            />
            <span className="mutation-group-label">
              <SVGText
                fillColor="#843100"
                strokeColor="#fff"
                strokeWidth={2}
                fontSize={14}
                fontWeight={700}
              >
                {title}
              </SVGText>
            </span>
          </label>
        ) : (
          <span className="mutation-group-label">
            <SVGText
              fillColor="#843100"
              strokeColor="#fff"
              strokeWidth={2}
              fontSize={14}
              fontWeight={700}
            >
              {title}
            </SVGText>
          </span>
        )}
      </div>
      <div className="mutations-list">
        {mutations.map(mutationName => {
          const mutation = weatherMutations.find(m => m.name === mutationName)
          if (!mutation) return null
          
          const isSelected = selectedMutations.includes(mutationName)
          const isDisabled = isMutationDisabled(mutationName, selectedMutations)
          const colorConfig = mutationColorConfig[mutation.color]
          
          return (
            <div
              key={mutationName}
              className={`mutation-item ${isSelected ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}`}
              style={{
                background: colorConfig.gradient || colorConfig.bgColor,
                opacity: isDisabled ? 0.4 : 1,
              }}
              onClick={() => {
                if (!isDisabled) {
                  isExclusive 
                    ? onToggleExclusiveMutation(mutationName) 
                    : onToggleMutation(mutationName)
                }
              }}
            >
              <SVGText
                fillColor="#fff"
                strokeColor="#000"
                strokeWidth={2}
                fontSize={14}
                fontWeight={900}
                className="mutation-name"
                style={{ width: '100%', height: '100%' }}
              >
                {mutationName}
              </SVGText>
              <img 
                className={`mutation-checkmark ${isSelected ? 'visible' : ''}`}
                src="https://now.bdstatic.com/stash/v1/5249c21/soundMyst/0ca7f11/carzyfarm/对号.png" 
                alt="选中"
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
