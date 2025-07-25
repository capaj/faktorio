
import React from 'react'
import {
  Text,
  View,
  StyleSheet,
  DocumentProps
} from '@react-pdf/renderer'

export const pdfStyles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#fff',
    // padding: 10,
    fontFamily: 'Inter',
    color: '#000'
  },
  section: {
    marginTop: 10,

    fontSize: 12,
    fontFamily: 'Inter'
  },
  flex: {
    display: 'flex',
    flexDirection: 'row'
  }
})

export const Flex = ({
  children,
  style
}: {
  children?: React.ReactNode
  style?: DocumentProps['style']
}) => {
  return (
    <View
      style={{
        display: 'flex',
        ...style
      }}
    >
      {children}
    </View>
  )
}

export const SectionHeading = ({ children }: { children: React.ReactNode }) => {
  return (
    <Text
      style={{
        fontSize: 12,
        color: '#454545'
      }}
    >
      {children}
    </Text>
  )
}

export const TextLabel = ({ children, style }: { children: React.ReactNode, style?: DocumentProps['style'] }) => {
  return (
    <Text
      style={{
        fontSize: 10,
        color: '#454545',
        ...style
      }}
    >
      {children}
    </Text>
  )
}

export const FlexRow = ({ children }: { children: React.ReactNode }) => {
  return (
    <Flex
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        fontSize: 10
      }}
    >
      {children}
    </Flex>
  )
}

export const ThirdWidthColumnRight = ({ children }: { children: React.ReactNode }) => {
  return (
    <Flex
      style={{
        width: '33%',
        textAlign: 'right'
      }}
    >
      <Text>{children}</Text>
    </Flex>
  )
}
export const ItemDescText = ({
  children,
  style
}: {
  children: React.ReactNode
  style?: DocumentProps['style']
}) => {
  return (
    <Text
      style={{
        marginRight: 10,
        ...style
      }}
    >
      {children}
    </Text>
  )
}